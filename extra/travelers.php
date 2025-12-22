<?php
// CORS headers - Allow requests from VisaD Notify dashboard
header('Access-Control-Allow-Origin: https://www.vault.visad.co.uk');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();
header('Content-Type: application/json');
include 'db.php';

function is_loggedin() {
    if (isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true) {
        return true;
    }
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
    return false;
}

function update_visa_link($conn, $table, $id) {
    $stmt_get = $conn->prepare("SELECT travel_country, visa_center FROM `$table` WHERE id = ?");
    $stmt_get->bind_param("i", $id);
    $stmt_get->execute();
    $result = $stmt_get->get_result()->fetch_assoc();
    $stmt_get->close();

    $country = $result['travel_country'] ? explode(' - ', $result['travel_country'])[0] : '';
    $center = $result['visa_center'] ? explode(' - ', $result['visa_center'])[0] : '';
    
    $url = '';
    $app_form_url = '';
    // First, try to find a specific match for country and center
    if (!empty($country) && !empty($center)) {
        $stmt_specific = $conn->prepare("SELECT url, application_form_url FROM visa_urls WHERE country = ? AND visa_center = ?");
        $stmt_specific->bind_param("ss", $country, $center);
        $stmt_specific->execute();
        $result_specific = $stmt_specific->get_result();
        if ($specific_row = $result_specific->fetch_assoc()) {
            $url = $specific_row['url'];
            $app_form_url = $specific_row['application_form_url'];
        }
        $stmt_specific->close();
    }

    // If no specific match, try to find a match for the country only
    if (empty($url) && !empty($country)) {
        $stmt_general = $conn->prepare("SELECT url, application_form_url FROM visa_urls WHERE country = ? AND (visa_center IS NULL OR visa_center = '')");
        $stmt_general->bind_param("s", $country);
        $stmt_general->execute();
        $result_general = $stmt_general->get_result();
        if ($general_row = $result_general->fetch_assoc()) {
            $url = $general_row['url'];
            $app_form_url = $general_row['application_form_url'];
        }
        $stmt_general->close();
    }

    // Update the traveler/dependent record with the found URLs
    $stmt_update = $conn->prepare("UPDATE `$table` SET visa_link = ?, application_form_link = ? WHERE id = ?");
    $stmt_update->bind_param("ssi", $url, $app_form_url, $id);
    $stmt_update->execute();
    $stmt_update->close();
}

function sync_family_address($conn, $traveler_id) {
    // get traveler address
    $stmt_main = $conn->prepare("SELECT address_line_1, address_line_2, city, state_province, zip_code, country FROM travelers WHERE id = ?");
    $stmt_main->bind_param("i", $traveler_id);
    $stmt_main->execute();
    $address = $stmt_main->get_result()->fetch_assoc();
    $stmt_main->close();

    // update dependents
    $stmt_update = $conn->prepare("UPDATE dependents SET address_line_1 = ?, address_line_2 = ?, city = ?, state_province = ?, zip_code = ?, country = ? WHERE traveler_id = ?");
    $stmt_update->bind_param("ssssssi", $address['address_line_1'], $address['address_line_2'], $address['city'], $address['state_province'], $address['zip_code'], $address['country'], $traveler_id);
    $stmt_update->execute();
    $stmt_update->close();
}


$action = $_GET['action'] ?? '';

switch ($action) {
    case 'create':
        if (is_loggedin()) createTraveler($conn);
        break;
    case 'read_all':
        // Allow public access for VisaD Notify dashboard
        readAllTravelers($conn);
        break;
    case 'read_one':
        if (is_loggedin()) readOneTraveler($conn);
        break;
    case 'update_field':
        if (is_loggedin()) updateTravelerField($conn);
        break;
    case 'delete':
        if (is_loggedin()) deleteTraveler($conn);
        break;
    case 'find_by_passport':
        if (is_loggedin()) findByPassport($conn);
        break;
    case 'get_form_data':
        if (is_loggedin()) get_form_data($conn);
        break;
    case 'set_lock_status':
        if (is_loggedin()) set_lock_status($conn); // Admin check can be added here
        break;
    
    // --- NEW ACTION ADDED HERE ---
    case 'delete_file':
        if (is_loggedin()) delete_file($conn);
        break;
    
    case 'get_full_data':
        if (is_loggedin()) get_full_data_travelers($conn);
        break;
    
    case 'save_invoice':
        if (is_loggedin()) save_invoice($conn);
        break;
    
    case 'save_all_invoices':
        if (is_loggedin()) save_all_invoices($conn);
        break;
    
    case 'get_invoice':
        if (is_loggedin()) get_invoice($conn);
        break;
        
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        break;
}

function createTraveler($conn) {
    $stmt = $conn->prepare("INSERT INTO travelers (name, first_name, last_name, priority, status, public_url_token, created_by_username) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssss", $name, $fname, $lname, $priority, $status, $token, $_SESSION['username']);
    $name = "Full Name";
    $fname = "";
    $lname = "";
    $priority = "Normal";
    $status = "Wait App";
    $token = substr(bin2hex(random_bytes(8)), 0, 8); // Generates a short 8-character token

    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        log_change($conn, 'traveler', $new_id, $name, 'Created Traveler', '', 'New Record');
        echo json_encode(['status' => 'success', 'id' => $new_id]);
    } else {
        echo json_encode(['status' => 'error', 'message' => $stmt->error]);
    }
}

function findByPassport($conn) {
    $passport_no = $_GET['passport_no'] ?? '';
    if (empty($passport_no)) {
        send_json(['status' => 'error', 'message' => 'Passport number required.']);
        return;
    }

    // Search in travelers first
    $stmt = $conn->prepare("SELECT * FROM travelers WHERE passport_no = ? LIMIT 1");
    $stmt->bind_param("s", $passport_no);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($record = $result->fetch_assoc()) {
        send_json(['status' => 'success', 'data' => $record]);
        return;
    }
    $stmt->close();

    // If not found, search in dependents
    $stmt = $conn->prepare("SELECT * FROM dependents WHERE passport_no = ? LIMIT 1");
    $stmt->bind_param("s", $passport_no);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($record = $result->fetch_assoc()) {
        send_json(['status' => 'success', 'data' => $record]);
        return;
    }
    $stmt->close();

    send_json(['status' => 'not_found']);
}


function updateTravelerField($conn) {
    $id = $_POST['id'] ?? 0;
    $field = $_POST['field'] ?? '';
    $value = $_POST['value'] ?? '';

    $allowed_fields = [
        'name', 'travel_country', 'visa_center', 'package', 'visa_type', 'status', 'whatsapp_contact', 
        'appointment_remarks', 'visa_link', 'note', 'planned_travel_date', 'first_name', 'last_name', 
        'gender', 'dob', 'nationality', 'passport_no', 'passport_issue', 'passport_expire', 
        'contact_number', 'email', 'priority', 'username', 'logins', 'notes', 'payment_status',
        'address_line_1', 'address_line_2', 'city', 'state_province', 'zip_code', 'doc_date', 'is_family',
        'public_url_token', 'country',
        'application_form_link', 'application_form_username', 'application_form_password', 'title',
        'place_of_birth', 'country_of_birth', 'relationship_to_main',
        'price', 'discount_type', 'discount_value', 'refund_amount'
    ];
    if (!in_array($field, $allowed_fields)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid field: ' . $field]);
        return;
    }

    // Get old value for logging
    $stmt_old = $conn->prepare("SELECT `name` FROM travelers WHERE id = ?");
    $stmt_old->bind_param("i", $id);
    $stmt_old->execute();
    $row_old = $stmt_old->get_result()->fetch_assoc();
    $record_name = $row_old['name'] ?? 'Record #' . $id;
    $stmt_old->close();

    $date_fields = ['dob', 'passport_issue', 'passport_expire', 'planned_travel_date', 'doc_date'];
    if (in_array($field, $date_fields) && empty($value)) {
        $value = NULL;
    }

    // Special handling for planned_travel_date to update traveler_questions table
    if ($field === 'planned_travel_date') {
        $stmt_old_q = $conn->prepare("SELECT travel_date_from FROM traveler_questions WHERE record_id = ? AND record_type = 'traveler'");
        $stmt_old_q->bind_param("i", $id);
        $stmt_old_q->execute();
        $old_value = $stmt_old_q->get_result()->fetch_assoc()['travel_date_from'] ?? '';
        $stmt_old_q->close();

        $stmt_q = $conn->prepare("INSERT INTO traveler_questions (record_id, record_type, travel_date_from) VALUES (?, 'traveler', ?) ON DUPLICATE KEY UPDATE travel_date_from = ?");
        $stmt_q->bind_param("iss", $id, $value, $value);
        $stmt_q->execute();
        $stmt_q->close();

    } else {
        $stmt_old_t = $conn->prepare("SELECT `$field` FROM travelers WHERE id = ?");
        $stmt_old_t->bind_param("i", $id);
        $stmt_old_t->execute();
        $old_value = $stmt_old_t->get_result()->fetch_assoc()[$field] ?? '';
        $stmt_old_t->close();
        
        $sql = "UPDATE travelers SET `$field` = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $value, $id);
        $stmt->execute();
        $stmt->close();
    }
    
    // Log change and update timestamp regardless of which table was updated
    if ($old_value !== $value) {
        log_change($conn, 'traveler', $id, $record_name, $field, $old_value, $value);
    }
    
    $stmt_update_ts = $conn->prepare("UPDATE travelers SET last_updated_by_username = ?, last_updated_at = NOW() WHERE id = ?");
    $stmt_update_ts->bind_param("si", $_SESSION['username'], $id);
    $stmt_update_ts->execute();
    $stmt_update_ts->close();
    
    // Post-update actions for other fields
    if ($field === 'travel_country' || $field === 'visa_center') {
        update_visa_link($conn, 'travelers', $id);
    }

    if ($field === 'is_family' || (in_array($field, ['address_line_1', 'address_line_2', 'city', 'state_province', 'zip_code', 'country']))) {
        $stmt_check_family = $conn->prepare("SELECT is_family FROM travelers WHERE id = ?");
        $stmt_check_family->bind_param("i", $id);
        $stmt_check_family->execute();
        $is_family = $stmt_check_family->get_result()->fetch_assoc()['is_family'];
        $stmt_check_family->close();

        if ($is_family) {
            sync_family_address($conn, $id);
        }
    }

    echo json_encode(['status' => 'success']);
}


function deleteTraveler($conn) {
    $id = $_POST['id'] ?? 0;
    $stmt_old = $conn->prepare("SELECT `name` FROM travelers WHERE id = ?");
    $stmt_old->bind_param("i", $id);
    $stmt_old->execute();
    $record_name = $stmt_old->get_result()->fetch_assoc()['name'] ?? 'Record #' . $id;
    $stmt_old->close();
    $conn->begin_transaction();
    try {
        $stmt_dep = $conn->prepare("DELETE FROM dependents WHERE traveler_id = ?");
        $stmt_dep->bind_param("i", $id);
        $stmt_dep->execute();
        $stmt_trav = $conn->prepare("DELETE FROM travelers WHERE id = ?");
        $stmt_trav->bind_param("i", $id);
        $stmt_trav->execute();
        $conn->commit();
        log_change($conn, 'traveler', $id, $record_name, 'Deleted Traveler', 'Exists', 'Deleted');
        echo json_encode(['status' => 'success']);
    } catch (mysqli_sql_exception $exception) {
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => $exception->getMessage()]);
    }
}

function format_timestamp_for_display($date_string) {
    if (empty($date_string)) return null;
    $date = new DateTime($date_string, new DateTimeZone('UTC'));
    $date->setTimezone(new DateTimeZone('Europe/London'));
    return $date->format('d/m/y H:i');
}

function readAllTravelers($conn) {
    $sql = "SELECT t.*, tq.progress_percentage, tq.travel_date_from AS tq_travel_date_from
            FROM travelers t 
            LEFT JOIN traveler_questions tq ON t.id = tq.record_id AND tq.record_type = 'traveler'
            ORDER BY t.id DESC";
    $result = $conn->query($sql);
    $travelers = [];
    while ($row = $result->fetch_assoc()) {
        $row['dependents'] = getDependentsForTraveler($conn, $row['id']);
        
        // Get saved invoice if exists
        $row['saved_invoice'] = getSavedInvoice($conn, $row['id']);
        
        // Prioritize travel date from traveler_questions
        $row['planned_travel_date'] = !empty($row['tq_travel_date_from']) ? $row['tq_travel_date_from'] : $row['planned_travel_date']; 
        
        $row['planned_travel_date_raw'] = $row['planned_travel_date'];
        $row['doc_date_raw'] = $row['doc_date'];
        $row['planned_travel_date'] = formatDate($row['planned_travel_date']);
        $row['dob'] = formatDate($row['dob']);
        $row['passport_issue'] = formatDate($row['passport_issue']);
        $row['passport_expire'] = formatDate($row['passport_expire']);
        $row['doc_date'] = formatDate($row['doc_date']);
        $row['created_at_formatted'] = format_timestamp_for_display($row['created_at']);
        $row['last_updated_at_formatted'] = format_timestamp_for_display($row['last_updated_at']);
        $travelers[] = $row;
    }
    echo json_encode(['status' => 'success', 'data' => $travelers]);
}

// Helper function to get saved invoice for a traveler - reads from travelers table columns
function getSavedInvoice($conn, $traveler_id) {
    $stmt = $conn->prepare("SELECT id, invoice_subtotal, invoice_discount_type, invoice_discount_value, 
        invoice_discount_amount, invoice_total, invoice_items_json, invoice_generated, invoice_generated_at
        FROM travelers WHERE id = ? AND invoice_generated = 1");
    $stmt->bind_param("i", $traveler_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $traveler = $result->fetch_assoc();
    $stmt->close();
    
    if ($traveler && $traveler['invoice_generated']) {
        return [
            'id' => $traveler['id'],
            'traveler_id' => $traveler_id,
            'invoice_number' => 'INV-' . str_pad($traveler_id, 4, '0', STR_PAD_LEFT),
            'subtotal' => $traveler['invoice_subtotal'],
            'discount_type' => $traveler['invoice_discount_type'],
            'discount_value' => $traveler['invoice_discount_value'],
            'discount_amount' => $traveler['invoice_discount_amount'],
            'total' => $traveler['invoice_total'],
            'items_json' => $traveler['invoice_items_json'],
            'created_at' => $traveler['invoice_generated_at']
        ];
    }
    return null;
}
function readOneTraveler($conn) {
    $id = $_GET['id'] ?? 0;
    $stmt = $conn->prepare("SELECT t.*, tq.progress_percentage, tq.travel_date_from AS tq_travel_date_from
                            FROM travelers t
                            LEFT JOIN traveler_questions tq ON t.id = tq.record_id AND tq.record_type = 'traveler'
                            WHERE t.id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $traveler = $result->fetch_assoc();
    if ($traveler) {
        $traveler['dependents'] = getDependentsForTraveler($conn, $id);

        // Prioritize travel date from traveler_questions
        $traveler['planned_travel_date'] = !empty($traveler['tq_travel_date_from']) ? $traveler['tq_travel_date_from'] : $traveler['planned_travel_date']; 

        $traveler['planned_travel_date_raw'] = $traveler['planned_travel_date'];
        $traveler['doc_date_raw'] = $traveler['doc_date'];
        $traveler['planned_travel_date'] = formatDate($traveler['planned_travel_date']);
        $traveler['dob'] = formatDate($traveler['dob']);
        $traveler['passport_issue'] = formatDate($traveler['passport_issue']);
        $traveler['passport_expire'] = formatDate($traveler['passport_expire']);
        $traveler['doc_date'] = formatDate($traveler['doc_date']);
        $traveler['created_at_formatted'] = format_timestamp_for_display($traveler['created_at']);
        $traveler['last_updated_at_formatted'] = format_timestamp_for_display($traveler['last_updated_at']);
        echo json_encode(['status' => 'success', 'data' => $traveler]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Traveler not found']);
    }
}
function getDependentsForTraveler($conn, $traveler_id) {
    $stmt = $conn->prepare("SELECT d.*, tq.progress_percentage, tq.travel_date_from AS tq_travel_date_from
                            FROM dependents d
                            LEFT JOIN traveler_questions tq ON d.id = tq.record_id AND tq.record_type = 'dependent'
                            WHERE d.traveler_id = ?");
    $stmt->bind_param("i", $traveler_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $dependents = [];
    while ($row = $result->fetch_assoc()) {
       // Prioritize travel date from traveler_questions
       $row['planned_travel_date'] = !empty($row['tq_travel_date_from']) ? $row['tq_travel_date_from'] : $row['planned_travel_date']; 

       $row['planned_travel_date_raw'] = $row['planned_travel_date'];
       $row['doc_date_raw'] = $row['doc_date'];
       $row['planned_travel_date'] = formatDate($row['planned_travel_date']);
       $row['dob'] = formatDate($row['dob']);
       $row['passport_issue'] = formatDate($row['passport_issue']);
       $row['passport_expire'] = formatDate($row['passport_expire']);
       $row['doc_date'] = formatDate($row['doc_date']);
       $row['created_at_formatted'] = format_timestamp_for_display($row['created_at']);
       $row['last_updated_at_formatted'] = format_timestamp_for_display($row['last_updated_at']);
       $dependents[] = $row;
    }
    return $dependents;
}

function get_form_data($conn) {
    $id = $_GET['id'] ?? 0;
    if (!$id) {
        send_json(['status' => 'error', 'message' => 'ID is required.']);
        return;
    }

    // --- Fetch ALL data from main travelers table ---
    $stmt_main = $conn->prepare("SELECT * FROM travelers WHERE id = ?");
    $stmt_main->bind_param("i", $id);
    $stmt_main->execute();
    $main_data = $stmt_main->get_result()->fetch_assoc();
    $stmt_main->close();

    if (!$main_data) {
         send_json(['status' => 'error', 'message' => 'Traveler not found.']);
         return;
    }

    // Fetch data from traveler_questions table
    $stmt_q = $conn->prepare("SELECT * FROM traveler_questions WHERE record_id = ? AND record_type = 'traveler'");
    $stmt_q->bind_param("i", $id);
    $stmt_q->execute();
    $questions_data = $stmt_q->get_result()->fetch_assoc();
    $stmt_q->close();

    // Combine data, prioritizing questions_data if it exists
    $combined_data = $questions_data ? array_merge($main_data, $questions_data) : $main_data;
    
    // Format dates
    $date_fields_to_format = [
        'travel_date_from', 'travel_date_to',
        'evisa_issue_date', 'evisa_expiry_date',
        'share_code_expiry_date',
        'dob', 'passport_issue', 'passport_expire' // Add personal dates too
    ];
    foreach ($date_fields_to_format as $field) {
        // Format dates that exist in the combined data
        if (isset($combined_data[$field])) {
            $combined_data[$field] = formatDate($combined_data[$field]);
        }
    }
        
    send_json(['status' => 'success', 'data' => $combined_data]);
}

function set_lock_status($conn) {
    if (!is_loggedin()) return; // Already checks for session

    $id = $_POST['id'] ?? 0;
    $locked = $_POST['locked'] ?? 0; // Will be 1 (to lock) or 0 (to unlock)
    $form_complete = intval($locked); // form_complete = 1 means locked

    if (!$id) {
        send_json(['status' => 'error', 'message' => 'Record ID is required.']);
        return;
    }

    // Get record name for logging
    $stmt_old = $conn->prepare("SELECT `name` FROM travelers WHERE id = ?");
    $stmt_old->bind_param("i", $id);
    $stmt_old->execute();
    $record_name = $stmt_old->get_result()->fetch_assoc()['name'] ?? 'Record #' . $id;
    $stmt_old->close();

    // Update the traveler_questions table
    // Ensure a record exists first
    $stmt_check = $conn->prepare("INSERT INTO traveler_questions (record_id, record_type) VALUES (?, 'traveler') ON DUPLICATE KEY UPDATE record_id = ?");
    $stmt_check->bind_param("ii", $id, $id);
    $stmt_check->execute();
    $stmt_check->close();

    $stmt = $conn->prepare("UPDATE traveler_questions SET form_complete = ? WHERE record_id = ? AND record_type = 'traveler'");
    $stmt->bind_param("ii", $form_complete, $id);
    
    if ($stmt->execute()) {
        $old_val = $form_complete ? 'Unlocked' : 'Locked';
        $new_val = $form_complete ? 'Locked' : 'Unlocked';
        log_change($conn, 'traveler', $id, $record_name, 'Form Lock Status', $old_val, $new_val);
        send_json(['status' => 'success', 'locked' => $form_complete]);
    } else {
        send_json(['status' => 'error', 'message' => 'Failed to update lock status.']);
    }
    $stmt->close();
}

function delete_file($conn) {
    $id = $_POST['id'] ?? 0;
    $field = $_POST['field'] ?? ''; 
    
    if (!$id || empty($field)) {
        echo json_encode(['status' => 'error', 'message' => 'Missing ID or Field parameter']);
        return;
    }

    // --- IMPORTANT: UPDATE THESE TO MATCH YOUR DB COLUMNS ---
    $allowed_fields = [
        'evisa_document', 
        'share_code_document', 
        'booking_document', 
        'passport_front', 
        'passport_back'
    ];
    // --------------------------------------------------------

    if (!in_array($field, $allowed_fields)) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid file field']);
        return;
    }

    // Check table: traveler_questions (standard for files)
    $stmt = $conn->prepare("SELECT `$field` FROM traveler_questions WHERE record_id = ? AND record_type = 'traveler'");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();

    if ($row) {
        $filename = $row[$field];

        // Delete physical file if it exists
        // Ensure this path is correct relative to this PHP file
        $upload_dir = '../uploads/'; 
        $file_path = $upload_dir . $filename;

        if (!empty($filename) && file_exists($file_path)) {
            @unlink($file_path); 
        }

        // Update DB to NULL
        $stmt_update = $conn->prepare("UPDATE traveler_questions SET `$field` = NULL WHERE record_id = ? AND record_type = 'traveler'");
        $stmt_update->bind_param("i", $id);
        
        if ($stmt_update->execute()) {
            log_change($conn, 'traveler', $id, "Traveler #$id", "Deleted File ($field)", $filename, 'Deleted');
            echo json_encode(['status' => 'success', 'message' => 'File deleted successfully']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Database update failed']);
        }
        $stmt_update->close();
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Record not found']);
    }
}

function formatDate($dateStr) {
    if (empty($dateStr) || $dateStr === '0000-00-00') { return null; }
    return date('d/m/Y', strtotime($dateStr));
}

function get_full_data_travelers($conn) {
    $id = $_GET['id'] ?? 0;
    
    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'ID required']);
        return;
    }
    
    // Fetch complete traveler data with all fields
    $stmt = $conn->prepare("
        SELECT 
            t.*,
            DATE_FORMAT(t.created_at, '%d/%m/%y %H:%i') as created_at_formatted,
            DATE_FORMAT(t.last_updated_at, '%d/%m/%y %H:%i') as last_updated_at_formatted
        FROM travelers t
        WHERE t.id = ?
    ");
    
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $record = $result->fetch_assoc();
    $stmt->close();
    
    if ($record) {
        // Format dates for display
        $date_fields = ['dob', 'passport_issue', 'passport_expire', 'planned_travel_date', 'doc_date'];
        foreach ($date_fields as $field) {
            if (!empty($record[$field]) && $record[$field] !== '0000-00-00') {
                $record[$field] = formatDate($record[$field]);
            }
        }
        
        echo json_encode(['status' => 'success', 'data' => $record]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Record not found']);
    }
}

// Save invoice data directly to travelers table
function save_invoice($conn) {
    $traveler_id = intval($_POST['id'] ?? 0);
    $subtotal = floatval($_POST['subtotal'] ?? 0);
    $discount_type = $_POST['discount_type'] ?? 'none';
    $discount_value = floatval($_POST['discount_value'] ?? 0);
    $discount_amount = floatval($_POST['discount_amount'] ?? 0);
    $total = floatval($_POST['total'] ?? 0);
    $items_json = $_POST['items_json'] ?? '[]';
    
    if (!$traveler_id) {
        echo json_encode(['status' => 'error', 'message' => 'Traveler ID is required']);
        return;
    }
    
    // Update the travelers table directly with invoice data
    $invoice_number = 'INV-' . str_pad($traveler_id, 4, '0', STR_PAD_LEFT);
    
    $subtotal_esc = $conn->real_escape_string($subtotal);
    $discount_type_esc = $conn->real_escape_string($discount_type);
    $discount_value_esc = $conn->real_escape_string($discount_value);
    $discount_amount_esc = $conn->real_escape_string($discount_amount);
    $total_esc = $conn->real_escape_string($total);
    $items_json_esc = $conn->real_escape_string($items_json);
    
    $sql = "UPDATE travelers SET 
        invoice_subtotal = '$subtotal_esc',
        invoice_discount_type = '$discount_type_esc',
        invoice_discount_value = '$discount_value_esc',
        invoice_discount_amount = '$discount_amount_esc',
        invoice_total = '$total_esc',
        invoice_items_json = '$items_json_esc',
        invoice_generated = 1,
        invoice_generated_at = NOW(),
        discount_type = '$discount_type_esc',
        discount_value = '$discount_value_esc'
        WHERE id = $traveler_id";
    
    if ($conn->query($sql)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Invoice saved',
            'data' => [
                'invoice_id' => $traveler_id,
                'invoice_number' => $invoice_number,
                'subtotal' => $subtotal,
                'discount_type' => $discount_type,
                'discount_value' => $discount_value,
                'discount_amount' => $discount_amount,
                'total' => $total
            ]
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to save invoice: ' . $conn->error]);
    }
}

// Save all invoices for travelers that don't have invoice_generated = 1
function save_all_invoices($conn) {
    // Helper function to get price from package
    function getPriceFromPackage($package) {
        if (!$package) return 149.00;
        $pkgLower = strtolower($package);
        if (strpos($pkgLower, 'appointment only') !== false) {
            return 99.00;
        } else if ((strpos($pkgLower, 'fast track') !== false && strpos($pkgLower, 'full support') !== false) || strpos($pkgLower, 'fast track full support') !== false) {
            return 349.00;
        } else if (strpos($pkgLower, 'fast track appointment') !== false) {
            return 199.00;
        } else if (strpos($pkgLower, 'full support') !== false) {
            return 149.00;
        }
        return 149.00;
    }
    
    // Get all travelers where invoice is not yet generated
    $result = $conn->query("SELECT id, first_name, last_name, package, visa_type, travel_country, price, discount_type, discount_value FROM travelers WHERE invoice_generated IS NULL OR invoice_generated = 0");
    
    $saved = 0;
    $errors = 0;
    
    while ($traveler = $result->fetch_assoc()) {
        $traveler_id = $traveler['id'];
        $items = [];
        
        // Main traveler price
        $mainPrice = floatval($traveler['price']) > 0 ? floatval($traveler['price']) : getPriceFromPackage($traveler['package']);
        $mainName = trim(($traveler['first_name'] ?? '') . ' ' . ($traveler['last_name'] ?? ''));
        
        $items[] = [
            'type' => 'main',
            'name' => $mainName,
            'package' => $traveler['package'] ?? 'Full Support',
            'visa_type' => $traveler['visa_type'] ?? '',
            'visa_country' => $traveler['travel_country'] ?? '',
            'price' => $mainPrice
        ];
        
        $subtotal = $mainPrice;
        
        // Get dependents
        $dep_result = $conn->query("SELECT id, first_name, last_name, package, visa_type, travel_country, price FROM dependents WHERE traveler_id = $traveler_id");
        while ($dep = $dep_result->fetch_assoc()) {
            $depPrice = floatval($dep['price']) > 0 ? floatval($dep['price']) : getPriceFromPackage($dep['package'] ?? $traveler['package']);
            $depName = trim(($dep['first_name'] ?? '') . ' ' . ($dep['last_name'] ?? ''));
            
            $items[] = [
                'type' => 'co-traveler',
                'id' => $dep['id'],
                'name' => $depName,
                'package' => $dep['package'] ?? $traveler['package'] ?? 'Full Support',
                'visa_type' => $dep['visa_type'] ?? $traveler['visa_type'] ?? '',
                'visa_country' => $dep['travel_country'] ?? $traveler['travel_country'] ?? '',
                'price' => $depPrice
            ];
            
            $subtotal += $depPrice;
        }
        
        // Calculate discount
        $discount_type = $traveler['discount_type'] ?? 'none';
        $discount_value = floatval($traveler['discount_value']) ?? 0;
        $discount_amount = 0;
        
        if ($discount_type === 'percentage' && $discount_value > 0) {
            $discount_amount = ($subtotal * $discount_value) / 100;
        } else if ($discount_type === 'fixed' && $discount_value > 0) {
            $discount_amount = $discount_value;
        }
        
        $total = $subtotal - $discount_amount;
        $items_json = json_encode($items);
        
        // Save to database
        $items_json_esc = $conn->real_escape_string($items_json);
        $discount_type_esc = $conn->real_escape_string($discount_type);
        
        $sql = "UPDATE travelers SET 
            invoice_subtotal = '$subtotal',
            invoice_discount_type = '$discount_type_esc',
            invoice_discount_value = '$discount_value',
            invoice_discount_amount = '$discount_amount',
            invoice_total = '$total',
            invoice_items_json = '$items_json_esc',
            invoice_generated = 1,
            invoice_generated_at = NOW()
            WHERE id = $traveler_id";
        
        if ($conn->query($sql)) {
            $saved++;
        } else {
            $errors++;
        }
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => "Saved $saved invoices" . ($errors > 0 ? ", $errors errors" : ""),
        'saved' => $saved,
        'errors' => $errors
    ]);
}

// Get invoice by traveler ID - reads from travelers table
function get_invoice($conn) {
    $traveler_id = intval($_GET['traveler_id'] ?? $_POST['traveler_id'] ?? 0);
    
    if (!$traveler_id) {
        echo json_encode(['status' => 'error', 'message' => 'Traveler ID is required']);
        return;
    }
    
    $stmt = $conn->prepare("SELECT id, invoice_subtotal, invoice_discount_type, invoice_discount_value, 
        invoice_discount_amount, invoice_total, invoice_items_json, invoice_generated, invoice_generated_at
        FROM travelers WHERE id = ?");
    $stmt->bind_param("i", $traveler_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $traveler = $result->fetch_assoc();
    $stmt->close();
    
    if ($traveler && $traveler['invoice_generated']) {
        $invoice = [
            'id' => $traveler['id'],
            'traveler_id' => $traveler_id,
            'invoice_number' => 'INV-' . str_pad($traveler_id, 4, '0', STR_PAD_LEFT),
            'subtotal' => $traveler['invoice_subtotal'],
            'discount_type' => $traveler['invoice_discount_type'],
            'discount_value' => $traveler['invoice_discount_value'],
            'discount_amount' => $traveler['invoice_discount_amount'],
            'total' => $traveler['invoice_total'],
            'items_json' => $traveler['invoice_items_json'],
            'created_at' => $traveler['invoice_generated_at']
        ];
        echo json_encode(['status' => 'success', 'data' => $invoice]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invoice not found']);
    }
}

$conn->close();
?>