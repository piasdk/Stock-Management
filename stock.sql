-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 23, 2026 at 11:53 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `stock`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `audit_log_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` int(10) UNSIGNED NOT NULL,
  `action` enum('create','update','delete','login','logout') NOT NULL,
  `description` text DEFAULT NULL,
  `changes_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`changes_json`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bill_of_materials`
--

CREATE TABLE `bill_of_materials` (
  `bom_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(11) NOT NULL,
  `revision_code` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `effective_from` date DEFAULT NULL,
  `effective_to` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `unit_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bill_of_materials`
--

INSERT INTO `bill_of_materials` (`bom_id`, `company_id`, `branch_id`, `product_id`, `variant_id`, `revision_code`, `is_active`, `effective_from`, `effective_to`, `notes`, `unit_id`) VALUES
(1, 1, 1, 3, 6, 'v1.0', 1, '2026-03-17', '2027-02-17', 'BOM for Yogurt 250ml cup production including raw materials and packaging', 13);

-- --------------------------------------------------------

--
-- Table structure for table `bill_of_materials_items`
--

CREATE TABLE `bill_of_materials_items` (
  `bom_item_id` int(10) UNSIGNED NOT NULL,
  `bom_id` int(10) UNSIGNED NOT NULL,
  `component_variant_id` int(11) NOT NULL,
  `component_quantity` decimal(18,4) NOT NULL,
  `scrap_factor` decimal(5,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bill_of_materials_items`
--

INSERT INTO `bill_of_materials_items` (`bom_item_id`, `bom_id`, `component_variant_id`, `component_quantity`, `scrap_factor`) VALUES
(1, 1, 2, 250.0000, 2.00);

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `branch_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `code` varchar(50) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address_line1` varchar(200) DEFAULT NULL,
  `address_line2` varchar(200) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(40) DEFAULT NULL,
  `country` varchar(2) DEFAULT NULL,
  `is_headquarters` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`branch_id`, `company_id`, `name`, `code`, `email`, `phone`, `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`, `is_headquarters`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Maska HQ', 'MSK-HQ', 'masakahq@gmail.com', '+250791392784', '5 KN @& street, Kigali, Rwanda', '', 'Kigali', '', '0000', 'Rw', 1, 1, '2026-02-10 18:13:14', '2026-02-10 18:13:14');

-- --------------------------------------------------------

--
-- Table structure for table `cash_accounts`
--

CREATE TABLE `cash_accounts` (
  `cash_account_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `account_code` varchar(30) NOT NULL,
  `name` varchar(150) NOT NULL,
  `account_type` enum('cash','bank','mobile_money','other') DEFAULT 'cash',
  `currency` char(3) DEFAULT 'USD',
  `linked_gl_account` int(10) UNSIGNED DEFAULT NULL,
  `opening_balance` decimal(18,4) DEFAULT 0.0000,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cash_transactions`
--

CREATE TABLE `cash_transactions` (
  `cash_transaction_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `cash_account_id` int(10) UNSIGNED NOT NULL,
  `transaction_type` enum('receipt','disbursement','transfer_in','transfer_out') NOT NULL,
  `transaction_date` date NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `currency` char(3) DEFAULT 'USD',
  `exchange_rate` decimal(18,8) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `counterparty_name` varchar(150) DEFAULT NULL,
  `counterparty_type` enum('supplier','customer','staff','other') DEFAULT 'other',
  `description` text DEFAULT NULL,
  `journal_entry_id` int(10) UNSIGNED DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `branch_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(10) UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`category_id`, `company_id`, `branch_id`, `name`, `description`, `parent_id`, `is_active`, `created_at`) VALUES
(1, 1, 1, 'Dairy Products', 'Finished dairy products like yogurt and milk', NULL, 1, '2026-02-10 20:35:15'),
(2, 1, 1, 'Food Dressings & Condiments', 'Mayonnaise and related products', NULL, 1, '2026-02-10 20:35:15'),
(3, 1, 1, 'Raw Materials & Ingredients', 'General raw materials used in production', NULL, 1, '2026-02-10 20:35:38'),
(4, 1, 1, 'Dairy Raw Materials', 'Milk and dairy-based raw materials', NULL, 1, '2026-02-10 20:35:38'),
(5, 1, 1, 'Starter Cultures', 'Cultures used for yogurt fermentation', NULL, 1, '2026-02-10 20:35:38'),
(6, 1, 1, 'Cultures & Enzymes', 'Bacterial cultures and enzymes', NULL, 1, '2026-02-10 20:35:38'),
(7, 1, 1, 'Sweeteners', 'Sugar and sweetening agents', NULL, 1, '2026-02-10 20:35:38'),
(8, 1, 1, 'Flavorings', 'Flavoring agents for dairy products', NULL, 1, '2026-02-10 20:35:38'),
(9, 1, 1, 'Stabilizers & Additives', 'Additives for texture and shelf life', NULL, 1, '2026-02-10 20:35:38'),
(10, 1, 1, 'Packaging Materials', 'Cups, bottles, boxes, and labels', NULL, 1, '2026-02-10 20:36:00'),
(11, 1, 1, 'Cleaning & Sanitation', 'Cleaning and hygiene materials', NULL, 1, '2026-02-10 20:36:00'),
(12, 1, 1, 'Quality Control Materials', 'Lab and testing materials', NULL, 1, '2026-02-10 20:36:00');

-- --------------------------------------------------------

--
-- Table structure for table `chart_of_accounts`
--

CREATE TABLE `chart_of_accounts` (
  `account_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `parent_account_id` int(10) UNSIGNED DEFAULT NULL,
  `account_code` varchar(30) NOT NULL,
  `name` varchar(150) NOT NULL,
  `account_type` enum('asset','liability','equity','income','expense','contra') NOT NULL,
  `account_category` varchar(50) DEFAULT NULL,
  `is_posting` tinyint(1) DEFAULT 1,
  `currency` char(3) DEFAULT 'USD',
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chart_of_accounts`
--

INSERT INTO `chart_of_accounts` (`account_id`, `company_id`, `parent_account_id`, `account_code`, `name`, `account_type`, `account_category`, `is_posting`, `currency`, `notes`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, '1010', 'Masaka Farms Bank', 'asset', 'bank', 1, 'RWF', 'Main operating bank holding company funds', 1, '2026-02-18 16:41:59', '2026-02-18 16:59:34'),
(2, 1, NULL, '1000', 'Masaka Farms Cash on Hand', 'asset', 'cash', 1, 'RWF', 'Physical cash available in office', 1, '2026-02-18 16:56:40', '2026-02-18 16:56:40'),
(3, 1, NULL, '3000', 'Owner Capital', 'equity', 'capital', 1, 'RWF', 'Owner investment into business', 1, '2026-02-18 17:02:25', '2026-02-18 17:02:25');

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

CREATE TABLE `companies` (
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `legal_name` varchar(200) DEFAULT NULL,
  `company_code` varchar(50) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `currency` char(3) DEFAULT 'USD',
  `timezone` varchar(64) DEFAULT 'UTC',
  `logo_url` varchar(255) DEFAULT NULL,
  `address_line1` varchar(200) DEFAULT NULL,
  `address_line2` varchar(200) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(40) DEFAULT NULL,
  `country` varchar(2) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `website` varchar(150) DEFAULT NULL,
  `subscription_plan` enum('free','basic','premium','enterprise') DEFAULT 'free',
  `subscription_start_date` datetime DEFAULT NULL,
  `subscription_end_date` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `companies`
--

INSERT INTO `companies` (`company_id`, `name`, `legal_name`, `company_code`, `tax_id`, `currency`, `timezone`, `logo_url`, `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`, `phone`, `email`, `website`, `subscription_plan`, `subscription_start_date`, `subscription_end_date`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'MASAKA FARMS', 'masaka farms ltd', NULL, NULL, 'USD', 'UTC', NULL, NULL, NULL, NULL, NULL, NULL, 'Rw', '+250791392784', 'masaka@gmail.com', NULL, 'free', NULL, NULL, 1, '2026-02-10 18:02:16', '2026-02-10 18:02:16');

-- --------------------------------------------------------

--
-- Table structure for table `currencies`
--

CREATE TABLE `currencies` (
  `currency_code` char(3) NOT NULL,
  `currency_name` varchar(100) NOT NULL,
  `symbol` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `currencies`
--

INSERT INTO `currencies` (`currency_code`, `currency_name`, `symbol`) VALUES
('EUR', 'Euro', '€'),
('KES', 'Kenyan Shilling', 'Ksh'),
('RWF', 'Rwandan Franc', 'FRw'),
('USD', 'US Dollar', '$');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `customer_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `contact_name` varchar(150) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `billing_address` text DEFAULT NULL,
  `shipping_address` text DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`customer_id`, `company_id`, `name`, `contact_name`, `phone`, `email`, `billing_address`, `shipping_address`, `tax_id`, `notes`, `is_active`, `created_at`) VALUES
(1, 1, 'Serena Hotel', 'Inema Rosette', '0791392784', 'serenahotel@gmail.com', NULL, NULL, NULL, NULL, 1, '2026-02-16 12:03:20');

-- --------------------------------------------------------

--
-- Table structure for table `customer_invoices`
--

CREATE TABLE `customer_invoices` (
  `invoice_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `so_id` int(10) UNSIGNED DEFAULT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `status` enum('draft','issued','partially_paid','paid','void') DEFAULT 'draft',
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `payment_term_id` int(10) UNSIGNED DEFAULT NULL,
  `currency` char(3) DEFAULT 'USD',
  `subtotal_amount` decimal(18,4) DEFAULT NULL,
  `tax_amount` decimal(18,4) DEFAULT NULL,
  `discount_amount` decimal(18,4) DEFAULT NULL,
  `total_amount` decimal(18,4) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_invoice_items`
--

CREATE TABLE `customer_invoice_items` (
  `invoice_item_id` int(10) UNSIGNED NOT NULL,
  `invoice_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_price` decimal(18,4) NOT NULL,
  `tax_code_id` int(10) UNSIGNED DEFAULT NULL,
  `tax_amount` decimal(18,4) DEFAULT NULL,
  `line_total` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_payments`
--

CREATE TABLE `customer_payments` (
  `customer_payment_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `cash_account_id` int(10) UNSIGNED NOT NULL,
  `payment_number` varchar(50) NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `currency` char(3) DEFAULT 'USD',
  `exchange_rate` decimal(18,8) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_payment_allocations`
--

CREATE TABLE `customer_payment_allocations` (
  `allocation_id` int(10) UNSIGNED NOT NULL,
  `customer_payment_id` int(10) UNSIGNED NOT NULL,
  `invoice_id` int(10) UNSIGNED NOT NULL,
  `amount_applied` decimal(18,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `destroyed_items`
--

CREATE TABLE `destroyed_items` (
  `destroyed_item_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `location_id` int(10) UNSIGNED NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `destruction_type` enum('expired','damaged','contaminated','obsolete','other') DEFAULT 'other',
  `destruction_reason` text DEFAULT NULL,
  `approved_by` int(10) UNSIGNED DEFAULT NULL,
  `recorded_by` int(10) UNSIGNED DEFAULT NULL,
  `destruction_date` datetime DEFAULT current_timestamp(),
  `reference_number` varchar(60) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `destroyed_item_attachments`
--

CREATE TABLE `destroyed_item_attachments` (
  `attachment_id` int(10) UNSIGNED NOT NULL,
  `destroyed_item_id` int(10) UNSIGNED NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `uploaded_by` int(10) UNSIGNED DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exchange_rates`
--

CREATE TABLE `exchange_rates` (
  `exchange_rate_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `base_currency` char(3) NOT NULL,
  `foreign_currency` char(3) NOT NULL,
  `rate_date` date NOT NULL,
  `rate_value` decimal(18,8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expense_items`
--

CREATE TABLE `expense_items` (
  `expense_item_id` int(10) UNSIGNED NOT NULL,
  `expense_report_id` int(10) UNSIGNED NOT NULL,
  `expense_date` date NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `amount` decimal(18,4) NOT NULL,
  `currency` char(3) DEFAULT 'USD',
  `tax_code_id` int(10) UNSIGNED DEFAULT NULL,
  `billable_to_customer_id` int(10) UNSIGNED DEFAULT NULL,
  `invoice_item_id` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expense_reports`
--

CREATE TABLE `expense_reports` (
  `expense_report_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `submitted_by` int(10) UNSIGNED NOT NULL,
  `report_number` varchar(50) NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `status` enum('draft','submitted','approved','reimbursed','rejected') DEFAULT 'draft',
  `total_amount` decimal(18,4) DEFAULT NULL,
  `currency` char(3) DEFAULT 'USD',
  `submitted_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approved_by` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fiscal_periods`
--

CREATE TABLE `fiscal_periods` (
  `fiscal_period_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `period_name` varchar(50) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('open','closed','locked') DEFAULT 'open',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `goods_receipts`
--

CREATE TABLE `goods_receipts` (
  `receipt_id` int(10) UNSIGNED NOT NULL,
  `po_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `receipt_number` varchar(50) DEFAULT NULL,
  `receipt_date` datetime DEFAULT current_timestamp(),
  `received_by` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `goods_receipt_items`
--

CREATE TABLE `goods_receipt_items` (
  `receipt_item_id` int(10) UNSIGNED NOT NULL,
  `receipt_id` int(10) UNSIGNED NOT NULL,
  `po_item_id` int(10) UNSIGNED DEFAULT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `location_id` int(10) UNSIGNED NOT NULL,
  `quantity_received` decimal(18,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `inventory_id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `quantity` decimal(12,2) DEFAULT 0.00,
  `minimum_stock` decimal(12,2) DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_checks`
--

CREATE TABLE `inventory_checks` (
  `inventory_check_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `location_id` int(10) UNSIGNED DEFAULT NULL,
  `reference_code` varchar(50) DEFAULT NULL,
  `status` enum('draft','in_progress','completed','cancelled') DEFAULT 'draft',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_check_items`
--

CREATE TABLE `inventory_check_items` (
  `inventory_check_item_id` int(10) UNSIGNED NOT NULL,
  `inventory_check_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `expected_quantity` decimal(18,4) DEFAULT NULL,
  `counted_quantity` decimal(18,4) DEFAULT NULL,
  `variance_quantity` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `journal_entries`
--

CREATE TABLE `journal_entries` (
  `journal_entry_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `journal_number` varchar(50) NOT NULL,
  `journal_type` enum('general','sales','purchase','cash','inventory','adjustment') DEFAULT 'general',
  `entry_date` date NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `memo` text DEFAULT NULL,
  `fiscal_period_id` int(10) UNSIGNED DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `journal_entries`
--

INSERT INTO `journal_entries` (`journal_entry_id`, `company_id`, `journal_number`, `journal_type`, `entry_date`, `reference`, `memo`, `fiscal_period_id`, `created_by`, `created_at`) VALUES
(1, 1, 'CAP-001', 'general', '2026-02-18', 'CAP-001', 'Initial capital for Masaka Farms', NULL, 5, '2026-02-18 17:19:06');

-- --------------------------------------------------------

--
-- Table structure for table `journal_entry_lines`
--

CREATE TABLE `journal_entry_lines` (
  `journal_entry_line_id` int(10) UNSIGNED NOT NULL,
  `journal_entry_id` int(10) UNSIGNED NOT NULL,
  `account_id` int(10) UNSIGNED NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `debit_amount` decimal(18,4) DEFAULT 0.0000,
  `credit_amount` decimal(18,4) DEFAULT 0.0000,
  `product_id` int(10) UNSIGNED DEFAULT NULL,
  `location_id` int(10) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `journal_entry_lines`
--

INSERT INTO `journal_entry_lines` (`journal_entry_line_id`, `journal_entry_id`, `account_id`, `description`, `debit_amount`, `credit_amount`, `product_id`, `location_id`) VALUES
(1, 1, 1, NULL, 80000000.0000, 0.0000, NULL, NULL),
(2, 1, 2, NULL, 20000000.0000, 0.0000, NULL, NULL),
(3, 1, 3, NULL, 0.0000, 100000000.0000, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `locations`
--

CREATE TABLE `locations` (
  `location_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `branch_id` int(10) UNSIGNED NOT NULL,
  `location_name` varchar(150) NOT NULL,
  `location_type` enum('production','storage','cold_room','packaging','warehouse','dispatch','office') NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `locations`
--

INSERT INTO `locations` (`location_id`, `company_id`, `branch_id`, `location_name`, `location_type`, `description`, `is_active`, `created_at`) VALUES
(1, 1, 1, 'Masaka Production Floor', 'production', 'Main milk processing and yogurt production area', 1, '2026-02-12 21:06:34'),
(2, 1, 1, 'Raw Material Store', 'storage', 'Storage for milk, sugar, cultures and ingredients', 1, '2026-02-12 21:06:34'),
(3, 1, 1, 'Packaging Section', 'packaging', 'Area for cup filling, sealing and labeling', 1, '2026-02-12 21:06:34'),
(4, 1, 1, 'Cold Room', 'cold_room', 'Refrigerated storage for finished yogurt', 1, '2026-02-12 21:06:34'),
(5, 1, 1, 'Finished Goods Warehouse', 'warehouse', 'Storage before dispatch', 1, '2026-02-12 21:06:34'),
(6, 1, 1, 'Dispatch Area', 'dispatch', 'Loading and distribution area', 1, '2026-02-12 21:06:34'),
(7, 1, 1, 'Administration Office', 'office', 'Administrative operations office', 1, '2026-02-12 21:06:34');

-- --------------------------------------------------------

--
-- Table structure for table `manufacturing_batches`
--

CREATE TABLE `manufacturing_batches` (
  `batch_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `batch_code` varchar(100) NOT NULL,
  `product_finished_id` int(10) UNSIGNED NOT NULL,
  `quantity_planned` decimal(18,4) DEFAULT NULL,
  `quantity_produced` decimal(18,4) DEFAULT NULL,
  `status` enum('planned','in_progress','completed','cancelled') DEFAULT 'planned',
  `production_date` datetime DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `manufacturing_materials`
--

CREATE TABLE `manufacturing_materials` (
  `material_usage_id` int(10) UNSIGNED NOT NULL,
  `batch_id` int(10) UNSIGNED NOT NULL,
  `component_product_id` int(10) UNSIGNED NOT NULL,
  `quantity_used` decimal(18,4) NOT NULL,
  `location_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_terms`
--

CREATE TABLE `payment_terms` (
  `payment_term_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `days_due` int(11) NOT NULL,
  `discount_percent` decimal(5,2) DEFAULT NULL,
  `discount_days` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `permission_id` int(10) UNSIGNED NOT NULL,
  `code` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`permission_id`, `code`, `description`, `category`) VALUES
(1, 'products.view', 'View products', 'products'),
(2, 'products.create', 'Create products', 'products'),
(3, 'products.update', 'Update products', 'products'),
(4, 'products.delete', 'Delete products', 'products'),
(5, 'inventory.view', 'View inventory', 'inventory'),
(6, 'inventory.adjust', 'Adjust inventory', 'inventory'),
(7, 'inventory.transfer', 'Transfer inventory', 'inventory'),
(8, 'sales.view', 'View sales', 'sales'),
(9, 'sales.create', 'Create sales orders', 'sales'),
(10, 'sales.update', 'Update sales orders', 'sales'),
(11, 'sales.delete', 'Delete sales orders', 'sales'),
(12, 'purchasing.view', 'View purchase orders', 'purchasing'),
(13, 'purchasing.create', 'Create purchase orders', 'purchasing'),
(14, 'purchasing.update', 'Update purchase orders', 'purchasing'),
(15, 'purchasing.approve', 'Approve purchase orders', 'purchasing'),
(16, 'users.view', 'View users', 'users'),
(17, 'users.create', 'Create users', 'users'),
(18, 'users.update', 'Update users', 'users'),
(19, 'users.delete', 'Delete users', 'users'),
(20, 'users.invite', 'Invite users', 'users'),
(21, 'companies.view', 'View companies', 'companies'),
(22, 'companies.create', 'Create companies', 'companies'),
(23, 'companies.update', 'Update companies', 'companies'),
(24, 'companies.delete', 'Delete companies', 'companies'),
(25, 'branches.view', 'View branches', 'branches'),
(26, 'branches.create', 'Create branches', 'branches'),
(27, 'branches.update', 'Update branches', 'branches'),
(28, 'branches.delete', 'Delete branches', 'branches'),
(29, 'finance.view', 'View financial data', 'finance'),
(30, 'finance.create', 'Create financial transactions', 'finance'),
(31, 'finance.update', 'Update financial transactions', 'finance'),
(32, 'finance.approve', 'Approve financial transactions', 'finance'),
(33, 'reports.view', 'View reports', 'reports'),
(34, 'reports.generate', 'Generate reports', 'reports'),
(35, 'settings.view', 'View settings', 'settings'),
(36, 'settings.update', 'Update settings', 'settings');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `branch_id` int(10) UNSIGNED DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `material_classification` enum('raw_material','finished_product') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `company_id`, `branch_id`, `category_id`, `name`, `description`, `material_classification`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 1, 'Pasteurized Fresh Milk', 'Fresh processed drinking milk', 'finished_product', 1, '2026-02-19 13:16:10', '2026-02-19 13:16:10'),
(2, 1, NULL, 4, 'Raw Milk', 'Raw Milk', 'raw_material', 1, '2026-03-12 17:44:41', '2026-03-12 17:44:41'),
(3, 1, NULL, 1, 'Yogurt', 'Fermented dairy yogurt', 'finished_product', 1, '2026-03-13 10:01:02', '2026-03-13 10:01:02'),
(4, 1, NULL, 1, 'Flavored Yogurt', 'Fruit flavored yogurt', 'finished_product', 1, '2026-03-13 10:01:02', '2026-03-13 10:01:02'),
(5, 1, NULL, 1, 'Greek Yogurt', 'Thick strained yogurt', 'finished_product', 1, '2026-03-13 10:01:02', '2026-03-13 10:01:02'),
(6, 1, NULL, 1, 'Natural Yogurt', 'Plain yogurt without flavor', 'finished_product', 1, '2026-03-13 10:01:02', '2026-03-13 10:01:02'),
(7, 1, NULL, 1, 'Milk', 'Processed drinking milk', 'finished_product', 1, '2026-03-13 10:01:02', '2026-03-13 10:01:02'),
(8, 1, NULL, 1, 'Ikivuguto', 'Traditional fermented milk', 'finished_product', 1, '2026-03-13 10:01:02', '2026-03-13 10:01:02'),
(9, 1, NULL, 2, 'Cocktail Eggless Mayonnaise', 'Eggless cocktail flavored mayonnaise', 'finished_product', 1, '2026-03-13 10:01:26', '2026-03-13 10:01:26'),
(10, 1, NULL, 2, 'Lemon Mayonnaise', 'Lemon flavored mayonnaise', 'finished_product', 1, '2026-03-13 10:01:26', '2026-03-13 10:01:26'),
(11, 1, NULL, 7, 'Sugar', 'Sweetener for dairy products', 'raw_material', 1, '2026-03-13 10:02:08', '2026-03-13 10:02:08'),
(12, 1, NULL, 8, 'Strawberry Flavor', 'Flavoring for yogurt', 'raw_material', 1, '2026-03-13 10:02:08', '2026-03-13 10:02:08'),
(13, 1, NULL, 8, 'Vanilla Flavor', 'Flavoring agent', 'raw_material', 1, '2026-03-13 10:02:08', '2026-03-13 10:02:08'),
(14, 1, NULL, 9, 'Stabilizer', 'Improves yogurt texture', 'raw_material', 1, '2026-03-13 10:02:08', '2026-03-13 10:02:08'),
(15, 1, NULL, 5, 'Yogurt Starter Culture', 'Fermentation bacteria', 'raw_material', 1, '2026-03-13 10:02:08', '2026-03-13 10:02:08'),
(16, 1, NULL, 10, 'Yogurt Cup', 'Plastic yogurt packaging cup', 'raw_material', 1, '2026-03-13 10:02:35', '2026-03-13 10:02:35'),
(17, 1, NULL, 10, 'Milk Bottle', 'Plastic milk bottle', 'raw_material', 1, '2026-03-13 10:02:35', '2026-03-13 10:02:35'),
(18, 1, NULL, 10, 'Bottle Cap', 'Bottle sealing cap', 'raw_material', 1, '2026-03-13 10:02:35', '2026-03-13 10:02:35'),
(19, 1, NULL, 10, 'Packaging Carton', 'Transport carton', 'raw_material', 1, '2026-03-13 10:02:35', '2026-03-13 10:02:35'),
(20, 1, NULL, 10, 'Product Labels', 'Labels for bottles and cups', 'raw_material', 1, '2026-03-13 10:02:35', '2026-03-13 10:02:35');

-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `image_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_price_history`
--

CREATE TABLE `product_price_history` (
  `price_history_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `old_price` decimal(18,4) DEFAULT NULL,
  `new_price` decimal(18,4) DEFAULT NULL,
  `changed_by` int(10) UNSIGNED DEFAULT NULL,
  `changed_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_variants`
--

CREATE TABLE `product_variants` (
  `variant_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
  `branch_id` int(10) UNSIGNED DEFAULT NULL,
  `variant_name` varchar(100) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `size` decimal(10,2) DEFAULT NULL,
  `unit_id` int(10) UNSIGNED DEFAULT NULL,
  `base_unit_id` int(10) UNSIGNED DEFAULT NULL,
  `units_per_package` int(11) DEFAULT NULL,
  `package_unit_id` int(10) UNSIGNED DEFAULT NULL,
  `price_per_unit` decimal(10,2) DEFAULT NULL,
  `price_per_package` decimal(10,2) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_variants`
--

INSERT INTO `product_variants` (`variant_id`, `product_id`, `company_id`, `branch_id`, `variant_name`, `sku`, `size`, `unit_id`, `base_unit_id`, `units_per_package`, `package_unit_id`, `price_per_unit`, `price_per_package`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES
(4, 1, NULL, NULL, 'Pasteurized Fresh Milk', 'PAS-500ML', 500.00, 13, 20, 12, 24, 600.00, 7200.00, NULL, 1, '2026-03-12 17:35:49', '2026-03-12 17:35:49'),
(5, 2, NULL, NULL, 'Raw Milk', 'RAW-BULK', 1.00, 12, 12, NULL, NULL, 450.00, NULL, NULL, 1, '2026-03-12 17:44:41', '2026-03-12 17:44:41'),
(6, 3, NULL, NULL, 'Yogurt 250ml Cup', 'YOG-250', 250.00, 13, 20, 12, 24, 500.00, 6000.00, NULL, 1, '2026-03-13 10:03:21', '2026-03-13 10:03:21'),
(7, 3, NULL, NULL, 'Yogurt 500ml Cup', 'YOG-500', 500.00, 13, 20, 12, 24, 900.00, 10800.00, NULL, 1, '2026-03-13 10:03:21', '2026-03-13 10:03:21'),
(8, 4, NULL, NULL, 'Strawberry Yogurt 250ml', 'FYOG-250', 250.00, 13, 20, 12, 24, 600.00, 7200.00, NULL, 1, '2026-03-13 10:03:49', '2026-03-13 10:03:49'),
(9, 6, NULL, NULL, 'Milk 500ml Bottle', 'MILK-500', 500.00, 13, 20, 12, 25, 600.00, 7200.00, NULL, 1, '2026-03-13 10:04:22', '2026-03-13 10:04:22'),
(10, 6, NULL, NULL, 'Milk 1L Bottle', 'MILK-1L', 1.00, 12, 20, 12, 25, 1000.00, 12000.00, NULL, 1, '2026-03-13 10:04:22', '2026-03-13 10:04:22'),
(13, 7, NULL, NULL, 'Cocktail Mayonnaise 500g', 'MAYO-500', 500.00, 14, 20, 12, 24, 1500.00, 18000.00, NULL, 1, '2026-03-13 10:05:08', '2026-03-13 10:05:08'),
(14, 8, NULL, NULL, 'Lemon Mayonnaise 500g', 'MAYO-LEMON-500', 500.00, 14, 20, 12, 24, 1500.00, 18000.00, NULL, 1, '2026-03-13 10:05:08', '2026-03-13 10:05:08'),
(15, 5, NULL, NULL, 'Greek Yogurt 250ml Cup', 'GYOG-250', 250.00, 13, 20, 12, 24, 800.00, 9600.00, NULL, 1, '2026-03-17 20:25:43', '2026-03-17 20:25:43'),
(16, 6, NULL, NULL, 'Natural Yogurt 250ml Cup', 'NYOG-250', 250.00, 13, 20, 12, 24, 700.00, 8400.00, NULL, 1, '2026-03-17 20:26:22', '2026-03-17 20:26:22'),
(17, 8, NULL, NULL, 'Ikivuguto 500ml Bottle', 'IKI-500', 500.00, 13, 20, 12, 25, 700.00, 8400.00, NULL, 1, '2026-03-17 20:26:45', '2026-03-17 20:26:45'),
(18, 11, NULL, NULL, 'Sugar 1kg', 'SUG-1KG', 1.00, 15, 15, NULL, NULL, 1200.00, NULL, NULL, 1, '2026-03-17 20:27:24', '2026-03-17 20:27:24'),
(19, 12, NULL, NULL, 'Strawberry Flavor 1kg', 'STR-FLV-1KG', 1.00, 15, 15, NULL, NULL, 3000.00, NULL, NULL, 1, '2026-03-17 20:27:44', '2026-03-17 20:27:44'),
(20, 15, NULL, NULL, 'Starter Culture 100g', 'CULT-100G', 100.00, 14, 14, NULL, NULL, 5000.00, NULL, NULL, 1, '2026-03-17 20:28:09', '2026-03-17 20:28:09'),
(21, 16, NULL, NULL, 'Yogurt Cup 250ml', 'CUP-250', 1.00, 20, 20, NULL, NULL, 100.00, NULL, NULL, 1, '2026-03-17 20:28:30', '2026-03-17 20:28:30'),
(22, 17, NULL, NULL, 'Milk Bottle 500ml', 'BOT-500', 1.00, 20, 20, NULL, NULL, 150.00, NULL, NULL, 1, '2026-03-17 20:29:12', '2026-03-17 20:29:12'),
(23, 17, NULL, NULL, 'Milk Bottle 500ml', 'BOT-500', 1.00, 20, 20, NULL, NULL, 150.00, NULL, NULL, 1, '2026-03-17 20:30:06', '2026-03-17 20:30:06'),
(24, 19, NULL, NULL, 'Packaging Carton', 'CARTON-001', 1.00, 24, 24, NULL, NULL, 500.00, NULL, NULL, 1, '2026-03-17 20:30:41', '2026-03-17 20:30:41'),
(25, 20, NULL, NULL, 'Product Label', 'LABEL-001', 1.00, 20, 20, NULL, NULL, 30.00, NULL, NULL, 1, '2026-03-17 20:31:13', '2026-03-17 20:31:13');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `po_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `supplier_id` int(10) UNSIGNED NOT NULL,
  `po_number` varchar(50) NOT NULL,
  `status` enum('draft','submitted','partially_received','received','cancelled') DEFAULT 'draft',
  `expected_date` date DEFAULT NULL,
  `total_amount` decimal(18,4) DEFAULT NULL,
  `currency` char(3) DEFAULT 'USD',
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `po_item_id` int(10) UNSIGNED NOT NULL,
  `po_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `quantity_ordered` decimal(18,4) NOT NULL,
  `quantity_received` decimal(18,4) DEFAULT 0.0000,
  `unit_cost` decimal(18,4) NOT NULL,
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `discount_amount` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `report_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `branch_id` int(10) UNSIGNED DEFAULT NULL,
  `report_name` varchar(255) NOT NULL,
  `report_type` enum('sales','purchase','inventory','financial','tax','custom') NOT NULL,
  `report_period` enum('daily','weekly','monthly','quarterly','yearly','custom') NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `parameters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`parameters`)),
  `generated_by` int(10) UNSIGNED DEFAULT NULL,
  `file_url` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `role_code` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `is_system_role` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `company_id`, `created_by`, `name`, `role_code`, `description`, `is_system_role`, `is_active`, `created_at`, `updated_at`) VALUES
(1, NULL, NULL, 'Super Admin', 'super_admin', 'Platform-level administrator with access to all companies', 1, 1, '2026-02-10 14:18:46', '2026-02-10 14:18:46'),
(2, NULL, NULL, 'Company Admin', 'company_admin', 'Company Administrator - Manages company and branches', 0, 1, '2026-02-10 18:28:25', '2026-02-10 18:28:25'),
(3, NULL, NULL, 'Branch Admin', 'branch_admin', 'Branch Administrator - Manages a specific branch', 0, 1, '2026-02-10 18:28:25', '2026-02-10 18:28:25'),
(4, NULL, NULL, 'Manager', 'manager', 'Manager - Manages day-to-day operations', 0, 1, '2026-02-10 18:28:25', '2026-02-10 18:28:25'),
(5, NULL, NULL, 'Staff', 'staff', 'Staff - Basic user access', 0, 1, '2026-02-10 18:28:25', '2026-02-10 18:28:25'),
(6, NULL, NULL, 'Accountant', 'accountant', 'Manages financial records and accounting', 0, 1, '2026-02-10 18:31:32', '2026-02-10 18:31:32'),
(7, 1, NULL, 'Supervisor', 'supervisor', 'oversees daily operations and manages a team to ensure tasks are completed effectively', 0, 1, '2026-02-10 21:00:28', '2026-02-10 21:00:28');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_permission_id` int(10) UNSIGNED NOT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `permission_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_orders`
--

CREATE TABLE `sales_orders` (
  `so_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `branch_id` int(10) UNSIGNED DEFAULT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `so_number` varchar(50) NOT NULL,
  `status` enum('draft','confirmed','allocated','shipped','completed','cancelled') DEFAULT 'draft',
  `payment_status` enum('pending','partial','paid','void') DEFAULT 'pending',
  `order_date` date DEFAULT NULL,
  `required_date` date DEFAULT NULL,
  `total_amount` decimal(18,4) DEFAULT NULL,
  `amount_paid` decimal(18,4) DEFAULT 0.0000,
  `currency` char(3) DEFAULT 'USD',
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_order_items`
--

CREATE TABLE `sales_order_items` (
  `so_item_id` int(10) UNSIGNED NOT NULL,
  `so_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `quantity_ordered` decimal(18,4) NOT NULL,
  `quantity_allocated` decimal(18,4) DEFAULT 0.0000,
  `quantity_shipped` decimal(18,4) DEFAULT 0.0000,
  `unit_price` decimal(18,4) NOT NULL,
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `discount_amount` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_returns`
--

CREATE TABLE `sales_returns` (
  `sales_return_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `so_id` int(10) UNSIGNED DEFAULT NULL,
  `return_number` varchar(50) DEFAULT NULL,
  `status` enum('requested','approved','received','rejected') DEFAULT 'requested',
  `total_credit` decimal(18,4) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_return_items`
--

CREATE TABLE `sales_return_items` (
  `sales_return_item_id` int(10) UNSIGNED NOT NULL,
  `sales_return_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `quantity_returned` decimal(18,4) NOT NULL,
  `credit_amount` decimal(18,4) DEFAULT NULL,
  `reason_code` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `setting_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shipments`
--

CREATE TABLE `shipments` (
  `shipment_id` int(10) UNSIGNED NOT NULL,
  `so_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `shipment_number` varchar(50) DEFAULT NULL,
  `shipment_date` datetime DEFAULT current_timestamp(),
  `carrier` varchar(100) DEFAULT NULL,
  `tracking_number` varchar(100) DEFAULT NULL,
  `shipped_by` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shipment_items`
--

CREATE TABLE `shipment_items` (
  `shipment_item_id` int(10) UNSIGNED NOT NULL,
  `shipment_id` int(10) UNSIGNED NOT NULL,
  `so_item_id` int(10) UNSIGNED DEFAULT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `location_id` int(10) UNSIGNED NOT NULL,
  `quantity_shipped` decimal(18,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_adjustments`
--

CREATE TABLE `stock_adjustments` (
  `adjustment_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `location_id` int(10) UNSIGNED NOT NULL,
  `adjustment_type` enum('increase','decrease') NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `reason_code` varchar(100) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_levels`
--

CREATE TABLE `stock_levels` (
  `stock_level_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `location_id` int(10) UNSIGNED NOT NULL,
  `quantity` decimal(18,4) DEFAULT 0.0000,
  `safety_stock` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_locations`
--

CREATE TABLE `stock_locations` (
  `location_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `branch_id` int(10) UNSIGNED DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `address_line1` varchar(200) DEFAULT NULL,
  `address_line2` varchar(200) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(40) DEFAULT NULL,
  `country` varchar(2) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `movement_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `location_id` int(10) UNSIGNED NOT NULL,
  `movement_type` enum('purchase','purchase_return','sale','sale_return','manufacture_in','manufacture_out','adjustment','transfer_in','transfer_out','write_off') NOT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int(10) UNSIGNED DEFAULT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_cost` decimal(18,4) DEFAULT NULL,
  `movement_date` datetime DEFAULT current_timestamp(),
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_transfers`
--

CREATE TABLE `stock_transfers` (
  `transfer_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `transfer_number` varchar(50) NOT NULL,
  `source_location_id` int(10) UNSIGNED NOT NULL,
  `destination_location_id` int(10) UNSIGNED NOT NULL,
  `status` enum('draft','in_transit','completed','cancelled') DEFAULT 'draft',
  `requested_by` int(10) UNSIGNED DEFAULT NULL,
  `approved_by` int(10) UNSIGNED DEFAULT NULL,
  `dispatched_at` datetime DEFAULT NULL,
  `received_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_transfer_items`
--

CREATE TABLE `stock_transfer_items` (
  `transfer_item_id` int(10) UNSIGNED NOT NULL,
  `transfer_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED NOT NULL,
  `variant_id` int(10) UNSIGNED DEFAULT NULL,
  `quantity_requested` decimal(18,4) NOT NULL,
  `quantity_dispatched` decimal(18,4) DEFAULT 0.0000,
  `quantity_received` decimal(18,4) DEFAULT 0.0000
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `supplier_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(200) NOT NULL,
  `contact_name` varchar(150) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address_line1` varchar(200) DEFAULT NULL,
  `address_line2` varchar(200) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `postal_code` varchar(40) DEFAULT NULL,
  `country` varchar(2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier_bills`
--

CREATE TABLE `supplier_bills` (
  `bill_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `supplier_id` int(10) UNSIGNED NOT NULL,
  `po_id` int(10) UNSIGNED DEFAULT NULL,
  `bill_number` varchar(50) NOT NULL,
  `status` enum('draft','approved','partially_paid','paid','void') DEFAULT 'draft',
  `bill_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `payment_term_id` int(10) UNSIGNED DEFAULT NULL,
  `currency` char(3) DEFAULT 'USD',
  `subtotal_amount` decimal(18,4) DEFAULT NULL,
  `tax_amount` decimal(18,4) DEFAULT NULL,
  `discount_amount` decimal(18,4) DEFAULT NULL,
  `total_amount` decimal(18,4) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier_bill_items`
--

CREATE TABLE `supplier_bill_items` (
  `bill_item_id` int(10) UNSIGNED NOT NULL,
  `bill_id` int(10) UNSIGNED NOT NULL,
  `product_id` int(10) UNSIGNED DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,4) NOT NULL,
  `unit_cost` decimal(18,4) NOT NULL,
  `tax_code_id` int(10) UNSIGNED DEFAULT NULL,
  `tax_amount` decimal(18,4) DEFAULT NULL,
  `line_total` decimal(18,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier_payments`
--

CREATE TABLE `supplier_payments` (
  `supplier_payment_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `supplier_id` int(10) UNSIGNED NOT NULL,
  `cash_account_id` int(10) UNSIGNED NOT NULL,
  `payment_number` varchar(50) NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(18,4) NOT NULL,
  `currency` char(3) DEFAULT 'USD',
  `exchange_rate` decimal(18,8) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier_payment_allocations`
--

CREATE TABLE `supplier_payment_allocations` (
  `allocation_id` int(10) UNSIGNED NOT NULL,
  `supplier_payment_id` int(10) UNSIGNED NOT NULL,
  `bill_id` int(10) UNSIGNED NOT NULL,
  `amount_applied` decimal(18,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tax_codes`
--

CREATE TABLE `tax_codes` (
  `tax_code_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `code` varchar(30) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `tax_type` enum('sales','purchase','withholding','other') DEFAULT 'sales',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tax_rates`
--

CREATE TABLE `tax_rates` (
  `tax_rate_id` int(10) UNSIGNED NOT NULL,
  `tax_code_id` int(10) UNSIGNED NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `rate_percent` decimal(7,4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tools`
--

CREATE TABLE `tools` (
  `tool_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `branch_id` int(10) UNSIGNED NOT NULL,
  `category_id` int(10) UNSIGNED NOT NULL,
  `location_id` int(10) UNSIGNED DEFAULT NULL,
  `tool_name` varchar(150) NOT NULL,
  `tool_code` varchar(3) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tools`
--

INSERT INTO `tools` (`tool_id`, `company_id`, `branch_id`, `category_id`, `location_id`, `tool_name`, `tool_code`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, 1, 'Milk Collection Can', 'MCC', 'Food-grade stainless steel milk collection container', 1, '2026-02-16 11:51:30', '2026-02-16 11:51:30'),
(2, 1, 1, 1, 1, 'Milk Weighing Scale', 'MWS', 'Scale used to measure incoming raw milk', 1, '2026-02-16 11:51:30', '2026-02-16 11:51:30'),
(3, 1, 1, 1, 1, 'Milk Testing Kit', 'MTK', 'Lactometer and alcohol test kit for quality control', 1, '2026-02-16 11:51:30', '2026-02-16 11:51:30'),
(4, 1, 1, 1, 1, 'Milk Filter', 'MF', 'Stainless steel or cloth filter for raw milk', 1, '2026-02-16 11:51:30', '2026-02-16 11:51:30'),
(5, 1, 1, 1, 1, 'Raw Milk Storage Tank', 'RMS', 'Temporary chilled storage tank for raw milk', 1, '2026-02-16 11:51:30', '2026-02-16 11:51:30'),
(6, 1, 1, 2, 1, 'Pasteurizer', 'PZ', 'Machine used to heat milk to kill harmful bacteria', 1, '2026-02-16 11:52:00', '2026-02-16 11:52:00'),
(7, 1, 1, 2, 1, 'Digital Thermometer', 'DT', 'Used to monitor milk heating temperature', 1, '2026-02-16 11:52:00', '2026-02-16 11:52:00'),
(8, 1, 1, 2, 1, 'Temperature Recorder', 'TRC', 'Records pasteurization temperatures', 1, '2026-02-16 11:52:00', '2026-02-16 11:52:00'),
(9, 1, 1, 2, 1, 'Holding Tank', 'HT', 'Tank for holding heated milk before cooling', 1, '2026-02-16 11:52:00', '2026-02-16 11:52:00'),
(10, 1, 1, 3, 1, 'Fermentation Tank', 'FT', 'Stainless steel tank for yogurt culturing', 1, '2026-02-16 11:52:23', '2026-02-16 11:52:23'),
(11, 1, 1, 3, 1, 'Incubator', 'INC', 'Temperature-controlled unit for fermentation', 1, '2026-02-16 11:52:23', '2026-02-16 11:52:23'),
(12, 1, 1, 3, 1, 'PH Meter', 'PHM', 'Measures acidity level during fermentation', 1, '2026-02-16 11:52:23', '2026-02-16 11:52:23'),
(13, 1, 1, 3, 1, 'Production Timer', 'PT', 'Used to monitor fermentation time', 1, '2026-02-16 11:52:23', '2026-02-16 11:52:23'),
(14, 1, 1, 4, 1, 'Mixing Tank', 'MT', 'Tank with agitator for blending ingredients', 1, '2026-02-16 11:52:49', '2026-02-16 11:52:49'),
(15, 1, 1, 4, 1, 'Food Grade Mixer', 'FGM', 'Mixer used for flavor integration', 1, '2026-02-16 11:52:49', '2026-02-16 11:52:49'),
(16, 1, 1, 4, 1, 'Measuring Cylinder', 'MCY', 'Used for measuring liquids accurately', 1, '2026-02-16 11:52:49', '2026-02-16 11:52:49'),
(17, 1, 1, 4, 1, 'Digital Weighing Scale', 'DWS', 'Scale for precise ingredient measurement', 1, '2026-02-16 11:52:49', '2026-02-16 11:52:49'),
(18, 1, 1, 3, 1, 'Cheese Cloth', 'CC', 'Used for whey drainage in Greek yogurt production', 1, '2026-02-16 11:53:22', '2026-02-16 11:53:22'),
(19, 1, 1, 3, 1, 'Whey Drainage Table', 'WDT', 'Table for straining whey from yogurt', 1, '2026-02-16 11:53:22', '2026-02-16 11:53:22'),
(20, 1, 1, 3, 1, 'Centrifugal Separator', 'CS', 'Industrial separator for whey removal', 1, '2026-02-16 11:53:22', '2026-02-16 11:53:22'),
(21, 1, 1, 4, 1, 'High Speed Emulsifier', 'HSE', 'Used to emulsify oil and milk solids', 1, '2026-02-16 11:53:38', '2026-02-16 11:53:38'),
(22, 1, 1, 4, 1, 'Homogenizer', 'HG', 'Blends and stabilizes mayonnaise mixture', 1, '2026-02-16 11:53:38', '2026-02-16 11:53:38'),
(23, 1, 1, 4, 1, 'Oil Measuring Tank', 'OMT', 'Tank for measuring vegetable oil', 1, '2026-02-16 11:53:38', '2026-02-16 11:53:38'),
(24, 1, 1, 5, 1, 'Cup Filling Machine', 'CFM', 'Fills yogurt cups automatically', 1, '2026-02-16 11:54:02', '2026-02-16 11:54:02'),
(25, 1, 1, 5, 1, 'Bottle Filling Machine', 'BFM', 'Fills bottled dairy products', 1, '2026-02-16 11:54:02', '2026-02-16 11:54:02'),
(26, 1, 1, 5, 1, 'Sealing Machine', 'SM', 'Seals product packaging', 1, '2026-02-16 11:54:02', '2026-02-16 11:54:02'),
(27, 1, 1, 5, 1, 'Labeling Machine', 'LM', 'Applies product labels', 1, '2026-02-16 11:54:02', '2026-02-16 11:54:02'),
(28, 1, 1, 5, 1, 'Date Printer', 'DP', 'Prints batch and expiry dates', 1, '2026-02-16 11:54:02', '2026-02-16 11:54:02'),
(29, 1, 1, 6, 1, 'Cold Room', 'CR', 'Chilled storage room for finished products', 1, '2026-02-16 11:54:27', '2026-02-16 11:54:27'),
(30, 1, 1, 6, 1, 'Industrial Freezer', 'IF', 'Freezer for long-term storage', 1, '2026-02-16 11:54:27', '2026-02-16 11:54:27'),
(31, 1, 1, 6, 1, 'Temperature Monitoring System', 'TMS', 'Monitors cold room temperature', 1, '2026-02-16 11:54:27', '2026-02-16 11:54:27'),
(32, 1, 1, 7, 1, 'Hand Wash Station', 'HWS', 'Hygiene station for staff', 1, '2026-02-16 11:54:42', '2026-02-16 11:54:42'),
(33, 1, 1, 7, 1, 'Sterilizer', 'ST', 'Sterilizes equipment and utensils', 1, '2026-02-16 11:54:42', '2026-02-16 11:54:42'),
(34, 1, 1, 7, 1, 'CIP System', 'CIP', 'Cleaning-In-Place automated cleaning system', 1, '2026-02-16 11:54:42', '2026-02-16 11:54:42'),
(35, 1, 1, 8, 1, 'Insulated Delivery Van', 'IDV', 'Vehicle for cold chain product delivery', 1, '2026-02-16 11:55:01', '2026-02-16 11:55:01'),
(36, 1, 1, 8, 1, 'Ice Box', 'IB', 'Portable cold storage for deliveries', 1, '2026-02-16 11:55:01', '2026-02-16 11:55:01'),
(37, 1, 1, 8, 1, 'Delivery Crates', 'DC', 'Crates for transporting packaged products', 1, '2026-02-16 11:55:01', '2026-02-16 11:55:01');

-- --------------------------------------------------------

--
-- Table structure for table `tool_categories`
--

CREATE TABLE `tool_categories` (
  `category_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED NOT NULL,
  `branch_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_id` int(10) UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tool_categories`
--

INSERT INTO `tool_categories` (`category_id`, `company_id`, `branch_id`, `name`, `description`, `parent_id`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'Raw Material Handling', 'Used for receiving and moving milk & ingredients', NULL, 1, '2026-02-12 18:58:28', '2026-02-12 18:58:28'),
(2, 1, 1, 'Processing Equipment', 'Equipment used in milk processing and product transformation', NULL, 1, '2026-02-12 18:59:49', '2026-02-12 18:59:49'),
(3, 1, 1, 'Fermentation Equipment', 'Equipment used for yogurt fermentation and incubation', NULL, 1, '2026-02-12 18:59:49', '2026-02-12 18:59:49'),
(4, 1, 1, 'Packaging Equipment', 'Machines used for filling, sealing, and labeling products', NULL, 1, '2026-02-12 18:59:49', '2026-02-12 18:59:49'),
(5, 1, 1, 'Storage & Cold Chain', 'Cold storage and refrigeration equipment', NULL, 1, '2026-02-12 18:59:49', '2026-02-12 18:59:49'),
(6, 1, 1, 'Transport & Logistics', 'Vehicles and transport equipment', NULL, 1, '2026-02-12 18:59:49', '2026-02-12 18:59:49'),
(7, 1, 1, 'Cleaning & Sanitation Equipment', 'Cleaning and hygiene systems', NULL, 1, '2026-02-12 18:59:49', '2026-02-12 18:59:49'),
(8, 1, 1, 'Quality Control Equipment', 'Testing and laboratory tools', NULL, 1, '2026-02-12 18:59:49', '2026-02-12 18:59:49'),
(9, 1, 1, 'Utilities & Power Equipment', 'Power and infrastructure support equipment', NULL, 1, '2026-02-12 18:59:49', '2026-02-12 18:59:49');

-- --------------------------------------------------------

--
-- Table structure for table `units`
--

CREATE TABLE `units` (
  `unit_id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `short_code` varchar(20) NOT NULL,
  `unit_type` enum('length','mass','volume') DEFAULT 'length',
  `base_unit_id` int(10) UNSIGNED DEFAULT NULL,
  `conversion_factor` decimal(18,6) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `units`
--

INSERT INTO `units` (`unit_id`, `name`, `short_code`, `unit_type`, `base_unit_id`, `conversion_factor`) VALUES
(1, 'Centimeter (cm)', 'cm', 'length', NULL, NULL),
(2, 'Foot (ft)', 'ft', 'length', NULL, NULL),
(3, 'Inch (in)', 'in', 'length', NULL, NULL),
(4, 'Kilometer (km)', 'km', 'length', NULL, NULL),
(5, 'Meter (m)', 'm', 'length', NULL, NULL),
(6, 'Mile (mi)', 'mi', 'length', NULL, NULL),
(7, 'Millimeter (mm)', 'mm', 'length', NULL, NULL),
(8, 'Yard (yd)', 'yd', 'length', NULL, NULL),
(9, 'Cup (cup)', 'cup', 'volume', NULL, NULL),
(10, 'Fluid Ounce (fl oz)', 'fl oz', 'volume', NULL, NULL),
(11, 'Gallon (gal)', 'gal', 'volume', NULL, NULL),
(12, 'Liter (L)', 'L', 'volume', NULL, NULL),
(13, 'Milliliter (mL)', 'mL', 'volume', NULL, NULL),
(14, 'Gram (g)', 'g', 'mass', NULL, NULL),
(15, 'Kilogram (kg)', 'kg', 'mass', NULL, NULL),
(16, 'Milligram (mg)', 'mg', 'mass', NULL, NULL),
(17, 'Ounce (oz)', 'oz', 'mass', NULL, NULL),
(18, 'Pound (lb)', 'lb', 'mass', NULL, NULL),
(19, 'Ton (ton)', 'ton', 'mass', NULL, NULL),
(20, 'Bottle', 'bottle', '', NULL, 1.000000),
(21, 'Can', 'can', '', NULL, 1.000000),
(22, 'Bag', 'bag', '', NULL, 1.000000),
(23, 'Packet', 'packet', '', NULL, 1.000000),
(24, 'Box', 'box', '', NULL, 1.000000),
(25, 'Carton', 'carton', '', NULL, 1.000000),
(26, 'Case', 'case', '', NULL, 1.000000),
(27, 'Pack', 'pack', '', NULL, 1.000000);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
  `branch_id` int(10) UNSIGNED DEFAULT NULL,
  `role_id` int(10) UNSIGNED DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `is_super_admin` tinyint(1) DEFAULT 0,
  `is_company_admin` tinyint(1) DEFAULT 0,
  `is_branch_admin` tinyint(1) DEFAULT 0,
  `status` enum('active','suspended','pending_invitation','invited') DEFAULT 'active',
  `email_verified` tinyint(1) DEFAULT 0,
  `last_login_at` datetime DEFAULT NULL,
  `invitation_token` varchar(255) DEFAULT NULL,
  `invitation_expires_at` datetime DEFAULT NULL,
  `invited_by` int(10) UNSIGNED DEFAULT NULL,
  `invited_at` datetime DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `company_id`, `branch_id`, `role_id`, `first_name`, `last_name`, `full_name`, `email`, `password_hash`, `avatar_url`, `is_super_admin`, `is_company_admin`, `is_branch_admin`, `status`, `email_verified`, `last_login_at`, `invitation_token`, `invitation_expires_at`, `invited_by`, `invited_at`, `password_reset_token`, `password_reset_expires_at`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, NULL, 'ABAYO', 'ISHIMWE Placidie', NULL, 'piasdk511@gmail.com', '$2a$10$zK50LlE2AinY1sKnJIlt..WAaQhra7mfi0Me9c6hsUKh.Sd/Fswb2', NULL, 1, 1, 0, 'active', 0, '2026-03-17 14:30:46', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-10 18:02:17', '2026-03-17 14:30:46'),
(2, 1, 1, 3, 'Pia', 'Ishimwe', NULL, 'piaishimwe6@gmail.com', '$2a$10$RUbkRlPDbw3cheRxyx/il.z3PKC6OTMT4H6SEojVXpGJRaiC5Kpii', NULL, 0, 0, 1, 'active', 0, '2026-03-17 14:30:01', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-10 19:36:03', '2026-03-17 14:30:01'),
(3, 1, 1, 4, 'Pia', 'SDK', NULL, 'ishimwepia6@gmail.com', '$2a$10$GgD3NKxTC1ZHON9lm05NeuObEYxVX4MyJ.BWrJaooY2oMcsknY4KG', NULL, 0, 0, 1, 'active', 0, '2026-03-17 14:28:28', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-10 20:05:06', '2026-03-17 14:28:28'),
(4, 1, 1, 7, 'Inema', 'Rosette', NULL, 'piaishimwe6@gmail.com', '$2a$10$.X2oBiI7t3UWLAGH5Y/ZCO4B.H0ZGPZKQHFpp8uxmTthD1YoRna/e', NULL, 0, 0, 1, 'active', 0, '2026-03-17 14:29:48', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-11 19:48:59', '2026-03-17 14:29:48'),
(5, 1, 1, 6, 'Ishema', 'Faustine', NULL, 'ishimwepia6@gmail.com', '$2a$10$ed37L5M7JVZzmDnXWPysOeHsdfoVCzoCknKTExLLqfhy7H5VzgQN.', NULL, 0, 0, 1, 'active', 0, '2026-03-17 14:27:56', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-17 16:04:12', '2026-03-17 14:27:56');

-- --------------------------------------------------------

--
-- Table structure for table `user_invitations`
--

CREATE TABLE `user_invitations` (
  `invitation_id` int(10) UNSIGNED NOT NULL,
  `company_id` int(10) UNSIGNED DEFAULT NULL,
  `branch_id` int(10) UNSIGNED DEFAULT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `email` varchar(150) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `invitation_token` varchar(255) NOT NULL,
  `invited_by` int(10) UNSIGNED NOT NULL,
  `status` enum('pending','accepted','expired','cancelled') DEFAULT 'pending',
  `expires_at` datetime NOT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_invitations`
--

INSERT INTO `user_invitations` (`invitation_id`, `company_id`, `branch_id`, `role_id`, `email`, `first_name`, `last_name`, `invitation_token`, `invited_by`, `status`, `expires_at`, `accepted_at`, `created_at`) VALUES
(2, 1, 1, 3, 'piaishimwe6@gmail.com', 'Pia', 'Ishimwe', 'e7f14f57e13d6a02809010e562e48709b979869090fb9f274b447f8f7c2fd7d9', 1, 'cancelled', '2026-02-17 18:57:32', NULL, '2026-02-10 18:57:32'),
(3, 1, 1, 3, 'piaishimwe6@gmail.com', 'pia', 'Ishimwe', '661da932ba6aa4f3864f6f4ab00a1c0e59788590f6116fc08b7d9bfee2b04fe5', 1, 'cancelled', '2026-02-17 19:32:57', NULL, '2026-02-10 19:32:57'),
(4, 1, 1, 3, 'piaishimwe6@gmail.com', 'Pia', 'Ishimwe', 'ebb51f8f1488d9292146638a0d2093afeb7db1cce2db912f03cb0fa6e32152fd', 1, 'accepted', '2026-02-17 19:35:08', '2026-02-10 19:36:02', '2026-02-10 19:35:08'),
(5, 1, 1, 4, 'ishimwepia6@gmail.com', 'Pia', 'SDK', '1a5c24ebc49b6b7ea801b830850372f51346ad1a458c185910825943a0db7a67', 2, 'accepted', '2026-02-17 20:04:17', '2026-02-10 20:05:05', '2026-02-10 20:04:17'),
(6, 1, 1, 7, 'piaishimwe6@gmail.com', 'Inema', 'Rosette', '1ef8a3a228c4d75c5277470d638025fc0a5f6f15ab2123adabd999c3a9ad7cd5', 2, 'accepted', '2026-02-18 19:47:06', '2026-02-11 19:48:59', '2026-02-11 19:47:06'),
(7, 1, 1, 6, 'ishimwepia6@gmail.com', 'Ishema', 'Faustine', '9562a3beef448e58b36275bb63ef133d8ded0da70656b6bd9d4a3ee132d7de43', 2, 'accepted', '2026-02-24 16:03:07', '2026-02-17 16:04:12', '2026-02-17 16:03:07');

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `user_role_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `assigned_by` int(10) UNSIGNED DEFAULT NULL,
  `assigned_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`audit_log_id`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `bill_of_materials`
--
ALTER TABLE `bill_of_materials`
  ADD PRIMARY KEY (`bom_id`),
  ADD UNIQUE KEY `uq_company_bom` (`company_id`,`product_id`,`revision_code`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `bill_of_materials_items`
--
ALTER TABLE `bill_of_materials_items`
  ADD PRIMARY KEY (`bom_item_id`),
  ADD KEY `bom_id` (`bom_id`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`branch_id`),
  ADD UNIQUE KEY `uq_company_branch_code` (`company_id`,`code`),
  ADD KEY `idx_company_branch` (`company_id`);

--
-- Indexes for table `cash_accounts`
--
ALTER TABLE `cash_accounts`
  ADD PRIMARY KEY (`cash_account_id`),
  ADD UNIQUE KEY `uq_company_cashaccount` (`company_id`,`account_code`),
  ADD KEY `linked_gl_account` (`linked_gl_account`);

--
-- Indexes for table `cash_transactions`
--
ALTER TABLE `cash_transactions`
  ADD PRIMARY KEY (`cash_transaction_id`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `cash_account_id` (`cash_account_id`),
  ADD KEY `journal_entry_id` (`journal_entry_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `uq_company_category` (`company_id`,`name`),
  ADD KEY `parent_id` (`parent_id`),
  ADD KEY `fk_categories_branch` (`branch_id`);

--
-- Indexes for table `chart_of_accounts`
--
ALTER TABLE `chart_of_accounts`
  ADD PRIMARY KEY (`account_id`),
  ADD UNIQUE KEY `uq_company_acct_code` (`company_id`,`account_code`),
  ADD KEY `parent_account_id` (`parent_account_id`);

--
-- Indexes for table `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`company_id`),
  ADD UNIQUE KEY `company_code` (`company_code`),
  ADD KEY `idx_company_code` (`company_code`),
  ADD KEY `idx_company_email` (`email`);

--
-- Indexes for table `currencies`
--
ALTER TABLE `currencies`
  ADD PRIMARY KEY (`currency_code`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `uq_company_customer` (`company_id`,`name`);

--
-- Indexes for table `customer_invoices`
--
ALTER TABLE `customer_invoices`
  ADD PRIMARY KEY (`invoice_id`),
  ADD UNIQUE KEY `uq_company_invoice` (`company_id`,`invoice_number`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `so_id` (`so_id`),
  ADD KEY `payment_term_id` (`payment_term_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `customer_invoice_items`
--
ALTER TABLE `customer_invoice_items`
  ADD PRIMARY KEY (`invoice_item_id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `tax_code_id` (`tax_code_id`);

--
-- Indexes for table `customer_payments`
--
ALTER TABLE `customer_payments`
  ADD PRIMARY KEY (`customer_payment_id`),
  ADD UNIQUE KEY `uq_company_custpayment` (`company_id`,`payment_number`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `cash_account_id` (`cash_account_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `customer_payment_allocations`
--
ALTER TABLE `customer_payment_allocations`
  ADD PRIMARY KEY (`allocation_id`),
  ADD KEY `customer_payment_id` (`customer_payment_id`),
  ADD KEY `invoice_id` (`invoice_id`);

--
-- Indexes for table `destroyed_items`
--
ALTER TABLE `destroyed_items`
  ADD PRIMARY KEY (`destroyed_item_id`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`),
  ADD KEY `location_id` (`location_id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `recorded_by` (`recorded_by`);

--
-- Indexes for table `destroyed_item_attachments`
--
ALTER TABLE `destroyed_item_attachments`
  ADD PRIMARY KEY (`attachment_id`),
  ADD KEY `destroyed_item_id` (`destroyed_item_id`),
  ADD KEY `uploaded_by` (`uploaded_by`);

--
-- Indexes for table `exchange_rates`
--
ALTER TABLE `exchange_rates`
  ADD PRIMARY KEY (`exchange_rate_id`),
  ADD UNIQUE KEY `uq_company_rate` (`company_id`,`base_currency`,`foreign_currency`,`rate_date`),
  ADD KEY `base_currency` (`base_currency`),
  ADD KEY `foreign_currency` (`foreign_currency`);

--
-- Indexes for table `expense_items`
--
ALTER TABLE `expense_items`
  ADD PRIMARY KEY (`expense_item_id`),
  ADD KEY `expense_report_id` (`expense_report_id`),
  ADD KEY `tax_code_id` (`tax_code_id`),
  ADD KEY `billable_to_customer_id` (`billable_to_customer_id`),
  ADD KEY `invoice_item_id` (`invoice_item_id`);

--
-- Indexes for table `expense_reports`
--
ALTER TABLE `expense_reports`
  ADD PRIMARY KEY (`expense_report_id`),
  ADD UNIQUE KEY `uq_company_expensereport` (`company_id`,`report_number`),
  ADD KEY `submitted_by` (`submitted_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `fiscal_periods`
--
ALTER TABLE `fiscal_periods`
  ADD PRIMARY KEY (`fiscal_period_id`),
  ADD UNIQUE KEY `uq_company_period` (`company_id`,`period_name`);

--
-- Indexes for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  ADD PRIMARY KEY (`receipt_id`),
  ADD UNIQUE KEY `uq_company_receipt` (`company_id`,`receipt_number`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `received_by` (`received_by`);

--
-- Indexes for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  ADD PRIMARY KEY (`receipt_item_id`),
  ADD KEY `receipt_id` (`receipt_id`),
  ADD KEY `po_item_id` (`po_item_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`),
  ADD KEY `location_id` (`location_id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`inventory_id`),
  ADD KEY `variant_id` (`variant_id`);

--
-- Indexes for table `inventory_checks`
--
ALTER TABLE `inventory_checks`
  ADD PRIMARY KEY (`inventory_check_id`),
  ADD UNIQUE KEY `uq_company_inventory_check` (`company_id`,`reference_code`),
  ADD KEY `location_id` (`location_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `inventory_check_items`
--
ALTER TABLE `inventory_check_items`
  ADD PRIMARY KEY (`inventory_check_item_id`),
  ADD KEY `inventory_check_id` (`inventory_check_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`);

--
-- Indexes for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD PRIMARY KEY (`journal_entry_id`),
  ADD UNIQUE KEY `uq_company_journal` (`company_id`,`journal_number`),
  ADD KEY `fiscal_period_id` (`fiscal_period_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `journal_entry_lines`
--
ALTER TABLE `journal_entry_lines`
  ADD PRIMARY KEY (`journal_entry_line_id`),
  ADD KEY `journal_entry_id` (`journal_entry_id`),
  ADD KEY `account_id` (`account_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `location_id` (`location_id`);

--
-- Indexes for table `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`location_id`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indexes for table `manufacturing_batches`
--
ALTER TABLE `manufacturing_batches`
  ADD PRIMARY KEY (`batch_id`),
  ADD UNIQUE KEY `uq_company_batch` (`company_id`,`batch_code`),
  ADD KEY `product_finished_id` (`product_finished_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `manufacturing_materials`
--
ALTER TABLE `manufacturing_materials`
  ADD PRIMARY KEY (`material_usage_id`),
  ADD KEY `batch_id` (`batch_id`),
  ADD KEY `component_product_id` (`component_product_id`),
  ADD KEY `location_id` (`location_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `payment_terms`
--
ALTER TABLE `payment_terms`
  ADD PRIMARY KEY (`payment_term_id`),
  ADD UNIQUE KEY `uq_company_term` (`company_id`,`name`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`permission_id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `idx_products_branch_id` (`branch_id`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`image_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `product_price_history`
--
ALTER TABLE `product_price_history`
  ADD PRIMARY KEY (`price_history_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `changed_by` (`changed_by`);

--
-- Indexes for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`variant_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `fk_variant_unit` (`unit_id`),
  ADD KEY `fk_variant_base_unit` (`base_unit_id`),
  ADD KEY `fk_variant_package_unit` (`package_unit_id`),
  ADD KEY `idx_product_variants_company_id` (`company_id`),
  ADD KEY `idx_product_variants_branch_id` (`branch_id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`po_id`),
  ADD UNIQUE KEY `uq_company_po` (`company_id`,`po_number`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`po_item_id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`report_id`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `generated_by` (`generated_by`),
  ADD KEY `idx_report_type` (`report_type`),
  ADD KEY `idx_report_date` (`created_at`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `uq_company_role_code` (`company_id`,`role_code`),
  ADD KEY `idx_company_role` (`company_id`),
  ADD KEY `idx_role_code` (`role_code`),
  ADD KEY `idx_role_creator` (`created_by`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_permission_id`),
  ADD UNIQUE KEY `uq_role_permission` (`role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- Indexes for table `sales_orders`
--
ALTER TABLE `sales_orders`
  ADD PRIMARY KEY (`so_id`),
  ADD UNIQUE KEY `uq_company_so` (`company_id`,`so_number`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `sales_order_items`
--
ALTER TABLE `sales_order_items`
  ADD PRIMARY KEY (`so_item_id`),
  ADD KEY `so_id` (`so_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`);

--
-- Indexes for table `sales_returns`
--
ALTER TABLE `sales_returns`
  ADD PRIMARY KEY (`sales_return_id`),
  ADD UNIQUE KEY `uq_company_return` (`company_id`,`return_number`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `so_id` (`so_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `sales_return_items`
--
ALTER TABLE `sales_return_items`
  ADD PRIMARY KEY (`sales_return_item_id`),
  ADD KEY `sales_return_id` (`sales_return_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`setting_id`),
  ADD UNIQUE KEY `uq_company_setting` (`company_id`,`setting_key`);

--
-- Indexes for table `shipments`
--
ALTER TABLE `shipments`
  ADD PRIMARY KEY (`shipment_id`),
  ADD UNIQUE KEY `uq_company_shipment` (`company_id`,`shipment_number`),
  ADD KEY `so_id` (`so_id`),
  ADD KEY `shipped_by` (`shipped_by`);

--
-- Indexes for table `shipment_items`
--
ALTER TABLE `shipment_items`
  ADD PRIMARY KEY (`shipment_item_id`),
  ADD KEY `shipment_id` (`shipment_id`),
  ADD KEY `so_item_id` (`so_item_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`),
  ADD KEY `location_id` (`location_id`);

--
-- Indexes for table `stock_adjustments`
--
ALTER TABLE `stock_adjustments`
  ADD PRIMARY KEY (`adjustment_id`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`),
  ADD KEY `location_id` (`location_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `stock_levels`
--
ALTER TABLE `stock_levels`
  ADD PRIMARY KEY (`stock_level_id`),
  ADD UNIQUE KEY `uq_stock` (`company_id`,`product_id`,`variant_id`,`location_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`),
  ADD KEY `location_id` (`location_id`);

--
-- Indexes for table `stock_locations`
--
ALTER TABLE `stock_locations`
  ADD PRIMARY KEY (`location_id`),
  ADD UNIQUE KEY `uq_company_location` (`company_id`,`code`),
  ADD KEY `idx_branch_location` (`branch_id`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`movement_id`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`),
  ADD KEY `location_id` (`location_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  ADD PRIMARY KEY (`transfer_id`),
  ADD UNIQUE KEY `uq_company_transfer` (`company_id`,`transfer_number`),
  ADD KEY `source_location_id` (`source_location_id`),
  ADD KEY `destination_location_id` (`destination_location_id`),
  ADD KEY `requested_by` (`requested_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `stock_transfer_items`
--
ALTER TABLE `stock_transfer_items`
  ADD PRIMARY KEY (`transfer_item_id`),
  ADD KEY `transfer_id` (`transfer_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `variant_id` (`variant_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`),
  ADD UNIQUE KEY `uq_company_supplier` (`company_id`,`name`);

--
-- Indexes for table `supplier_bills`
--
ALTER TABLE `supplier_bills`
  ADD PRIMARY KEY (`bill_id`),
  ADD UNIQUE KEY `uq_company_bill` (`company_id`,`bill_number`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `payment_term_id` (`payment_term_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `supplier_bill_items`
--
ALTER TABLE `supplier_bill_items`
  ADD PRIMARY KEY (`bill_item_id`),
  ADD KEY `bill_id` (`bill_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `tax_code_id` (`tax_code_id`);

--
-- Indexes for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  ADD PRIMARY KEY (`supplier_payment_id`),
  ADD UNIQUE KEY `uq_company_suppayment` (`company_id`,`payment_number`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `cash_account_id` (`cash_account_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `supplier_payment_allocations`
--
ALTER TABLE `supplier_payment_allocations`
  ADD PRIMARY KEY (`allocation_id`),
  ADD KEY `supplier_payment_id` (`supplier_payment_id`),
  ADD KEY `bill_id` (`bill_id`);

--
-- Indexes for table `tax_codes`
--
ALTER TABLE `tax_codes`
  ADD PRIMARY KEY (`tax_code_id`),
  ADD UNIQUE KEY `uq_company_taxcode` (`company_id`,`code`);

--
-- Indexes for table `tax_rates`
--
ALTER TABLE `tax_rates`
  ADD PRIMARY KEY (`tax_rate_id`),
  ADD KEY `tax_code_id` (`tax_code_id`);

--
-- Indexes for table `tools`
--
ALTER TABLE `tools`
  ADD PRIMARY KEY (`tool_id`),
  ADD UNIQUE KEY `uq_tool_code` (`company_id`,`tool_code`),
  ADD KEY `fk_tool_branch` (`branch_id`),
  ADD KEY `fk_tool_category` (`category_id`),
  ADD KEY `fk_tool_location` (`location_id`);

--
-- Indexes for table `tool_categories`
--
ALTER TABLE `tool_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `uq_tool_category` (`company_id`,`branch_id`,`name`),
  ADD KEY `fk_toolcat_branch` (`branch_id`),
  ADD KEY `fk_toolcat_parent` (`parent_id`);

--
-- Indexes for table `units`
--
ALTER TABLE `units`
  ADD PRIMARY KEY (`unit_id`),
  ADD UNIQUE KEY `uq_unit_short_code` (`short_code`),
  ADD KEY `base_unit_id` (`base_unit_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `invited_by` (`invited_by`),
  ADD KEY `idx_user_email` (`email`),
  ADD KEY `idx_company_user` (`company_id`),
  ADD KEY `idx_branch_user` (`branch_id`),
  ADD KEY `idx_invitation_token` (`invitation_token`),
  ADD KEY `idx_password_reset_token` (`password_reset_token`);

--
-- Indexes for table `user_invitations`
--
ALTER TABLE `user_invitations`
  ADD PRIMARY KEY (`invitation_id`),
  ADD UNIQUE KEY `invitation_token` (`invitation_token`),
  ADD KEY `company_id` (`company_id`),
  ADD KEY `branch_id` (`branch_id`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `invited_by` (`invited_by`),
  ADD KEY `idx_invitation_token` (`invitation_token`),
  ADD KEY `idx_invitation_status` (`status`),
  ADD KEY `idx_invitation_email` (`email`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`user_role_id`),
  ADD UNIQUE KEY `uq_user_role` (`user_id`,`role_id`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `assigned_by` (`assigned_by`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `audit_log_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bill_of_materials`
--
ALTER TABLE `bill_of_materials`
  MODIFY `bom_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `bill_of_materials_items`
--
ALTER TABLE `bill_of_materials_items`
  MODIFY `bom_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `branch_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `cash_accounts`
--
ALTER TABLE `cash_accounts`
  MODIFY `cash_account_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_transactions`
--
ALTER TABLE `cash_transactions`
  MODIFY `cash_transaction_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `chart_of_accounts`
--
ALTER TABLE `chart_of_accounts`
  MODIFY `account_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `companies`
--
ALTER TABLE `companies`
  MODIFY `company_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `customer_invoices`
--
ALTER TABLE `customer_invoices`
  MODIFY `invoice_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_invoice_items`
--
ALTER TABLE `customer_invoice_items`
  MODIFY `invoice_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_payments`
--
ALTER TABLE `customer_payments`
  MODIFY `customer_payment_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_payment_allocations`
--
ALTER TABLE `customer_payment_allocations`
  MODIFY `allocation_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `destroyed_items`
--
ALTER TABLE `destroyed_items`
  MODIFY `destroyed_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `destroyed_item_attachments`
--
ALTER TABLE `destroyed_item_attachments`
  MODIFY `attachment_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `exchange_rates`
--
ALTER TABLE `exchange_rates`
  MODIFY `exchange_rate_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expense_items`
--
ALTER TABLE `expense_items`
  MODIFY `expense_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expense_reports`
--
ALTER TABLE `expense_reports`
  MODIFY `expense_report_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fiscal_periods`
--
ALTER TABLE `fiscal_periods`
  MODIFY `fiscal_period_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  MODIFY `receipt_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  MODIFY `receipt_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `inventory_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_checks`
--
ALTER TABLE `inventory_checks`
  MODIFY `inventory_check_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_check_items`
--
ALTER TABLE `inventory_check_items`
  MODIFY `inventory_check_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `journal_entries`
--
ALTER TABLE `journal_entries`
  MODIFY `journal_entry_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `journal_entry_lines`
--
ALTER TABLE `journal_entry_lines`
  MODIFY `journal_entry_line_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `locations`
--
ALTER TABLE `locations`
  MODIFY `location_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `manufacturing_batches`
--
ALTER TABLE `manufacturing_batches`
  MODIFY `batch_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `manufacturing_materials`
--
ALTER TABLE `manufacturing_materials`
  MODIFY `material_usage_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_terms`
--
ALTER TABLE `payment_terms`
  MODIFY `payment_term_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `permission_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `image_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_price_history`
--
ALTER TABLE `product_price_history`
  MODIFY `price_history_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `variant_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `po_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `po_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `report_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `role_permission_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_orders`
--
ALTER TABLE `sales_orders`
  MODIFY `so_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_order_items`
--
ALTER TABLE `sales_order_items`
  MODIFY `so_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_returns`
--
ALTER TABLE `sales_returns`
  MODIFY `sales_return_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_return_items`
--
ALTER TABLE `sales_return_items`
  MODIFY `sales_return_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `setting_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shipments`
--
ALTER TABLE `shipments`
  MODIFY `shipment_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shipment_items`
--
ALTER TABLE `shipment_items`
  MODIFY `shipment_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_adjustments`
--
ALTER TABLE `stock_adjustments`
  MODIFY `adjustment_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_levels`
--
ALTER TABLE `stock_levels`
  MODIFY `stock_level_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_locations`
--
ALTER TABLE `stock_locations`
  MODIFY `location_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `movement_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  MODIFY `transfer_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_transfer_items`
--
ALTER TABLE `stock_transfer_items`
  MODIFY `transfer_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `supplier_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_bills`
--
ALTER TABLE `supplier_bills`
  MODIFY `bill_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_bill_items`
--
ALTER TABLE `supplier_bill_items`
  MODIFY `bill_item_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  MODIFY `supplier_payment_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_payment_allocations`
--
ALTER TABLE `supplier_payment_allocations`
  MODIFY `allocation_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tax_codes`
--
ALTER TABLE `tax_codes`
  MODIFY `tax_code_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tax_rates`
--
ALTER TABLE `tax_rates`
  MODIFY `tax_rate_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tools`
--
ALTER TABLE `tools`
  MODIFY `tool_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `tool_categories`
--
ALTER TABLE `tool_categories`
  MODIFY `category_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `units`
--
ALTER TABLE `units`
  MODIFY `unit_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `user_invitations`
--
ALTER TABLE `user_invitations`
  MODIFY `invitation_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `user_role_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `bill_of_materials`
--
ALTER TABLE `bill_of_materials`
  ADD CONSTRAINT `bill_of_materials_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `bill_of_materials_items`
--
ALTER TABLE `bill_of_materials_items`
  ADD CONSTRAINT `bill_of_materials_items_ibfk_1` FOREIGN KEY (`bom_id`) REFERENCES `bill_of_materials` (`bom_id`);

--
-- Constraints for table `branches`
--
ALTER TABLE `branches`
  ADD CONSTRAINT `branches_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE;

--
-- Constraints for table `cash_accounts`
--
ALTER TABLE `cash_accounts`
  ADD CONSTRAINT `cash_accounts_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `cash_accounts_ibfk_2` FOREIGN KEY (`linked_gl_account`) REFERENCES `chart_of_accounts` (`account_id`);

--
-- Constraints for table `cash_transactions`
--
ALTER TABLE `cash_transactions`
  ADD CONSTRAINT `cash_transactions_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `cash_transactions_ibfk_2` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`cash_account_id`),
  ADD CONSTRAINT `cash_transactions_ibfk_3` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`journal_entry_id`),
  ADD CONSTRAINT `cash_transactions_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `categories_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`category_id`),
  ADD CONSTRAINT `fk_categories_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_categories_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `chart_of_accounts`
--
ALTER TABLE `chart_of_accounts`
  ADD CONSTRAINT `chart_of_accounts_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `chart_of_accounts_ibfk_2` FOREIGN KEY (`parent_account_id`) REFERENCES `chart_of_accounts` (`account_id`);

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `customer_invoices`
--
ALTER TABLE `customer_invoices`
  ADD CONSTRAINT `customer_invoices_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `customer_invoices_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `customer_invoices_ibfk_3` FOREIGN KEY (`so_id`) REFERENCES `sales_orders` (`so_id`),
  ADD CONSTRAINT `customer_invoices_ibfk_4` FOREIGN KEY (`payment_term_id`) REFERENCES `payment_terms` (`payment_term_id`),
  ADD CONSTRAINT `customer_invoices_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `customer_invoice_items`
--
ALTER TABLE `customer_invoice_items`
  ADD CONSTRAINT `customer_invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `customer_invoices` (`invoice_id`),
  ADD CONSTRAINT `customer_invoice_items_ibfk_3` FOREIGN KEY (`tax_code_id`) REFERENCES `tax_codes` (`tax_code_id`);

--
-- Constraints for table `customer_payments`
--
ALTER TABLE `customer_payments`
  ADD CONSTRAINT `customer_payments_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `customer_payments_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `customer_payments_ibfk_3` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`cash_account_id`),
  ADD CONSTRAINT `customer_payments_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `customer_payment_allocations`
--
ALTER TABLE `customer_payment_allocations`
  ADD CONSTRAINT `customer_payment_allocations_ibfk_1` FOREIGN KEY (`customer_payment_id`) REFERENCES `customer_payments` (`customer_payment_id`),
  ADD CONSTRAINT `customer_payment_allocations_ibfk_2` FOREIGN KEY (`invoice_id`) REFERENCES `customer_invoices` (`invoice_id`);

--
-- Constraints for table `destroyed_items`
--
ALTER TABLE `destroyed_items`
  ADD CONSTRAINT `destroyed_items_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `destroyed_items_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`location_id`),
  ADD CONSTRAINT `destroyed_items_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `destroyed_items_ibfk_6` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `destroyed_item_attachments`
--
ALTER TABLE `destroyed_item_attachments`
  ADD CONSTRAINT `destroyed_item_attachments_ibfk_1` FOREIGN KEY (`destroyed_item_id`) REFERENCES `destroyed_items` (`destroyed_item_id`),
  ADD CONSTRAINT `destroyed_item_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `exchange_rates`
--
ALTER TABLE `exchange_rates`
  ADD CONSTRAINT `exchange_rates_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `exchange_rates_ibfk_2` FOREIGN KEY (`base_currency`) REFERENCES `currencies` (`currency_code`),
  ADD CONSTRAINT `exchange_rates_ibfk_3` FOREIGN KEY (`foreign_currency`) REFERENCES `currencies` (`currency_code`);

--
-- Constraints for table `expense_items`
--
ALTER TABLE `expense_items`
  ADD CONSTRAINT `expense_items_ibfk_1` FOREIGN KEY (`expense_report_id`) REFERENCES `expense_reports` (`expense_report_id`),
  ADD CONSTRAINT `expense_items_ibfk_2` FOREIGN KEY (`tax_code_id`) REFERENCES `tax_codes` (`tax_code_id`),
  ADD CONSTRAINT `expense_items_ibfk_3` FOREIGN KEY (`billable_to_customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `expense_items_ibfk_4` FOREIGN KEY (`invoice_item_id`) REFERENCES `customer_invoice_items` (`invoice_item_id`);

--
-- Constraints for table `expense_reports`
--
ALTER TABLE `expense_reports`
  ADD CONSTRAINT `expense_reports_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `expense_reports_ibfk_2` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `expense_reports_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `fiscal_periods`
--
ALTER TABLE `fiscal_periods`
  ADD CONSTRAINT `fiscal_periods_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `goods_receipts`
--
ALTER TABLE `goods_receipts`
  ADD CONSTRAINT `goods_receipts_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`po_id`),
  ADD CONSTRAINT `goods_receipts_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `goods_receipts_ibfk_3` FOREIGN KEY (`received_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  ADD CONSTRAINT `goods_receipt_items_ibfk_1` FOREIGN KEY (`receipt_id`) REFERENCES `goods_receipts` (`receipt_id`),
  ADD CONSTRAINT `goods_receipt_items_ibfk_2` FOREIGN KEY (`po_item_id`) REFERENCES `purchase_order_items` (`po_item_id`),
  ADD CONSTRAINT `goods_receipt_items_ibfk_5` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`location_id`);

--
-- Constraints for table `inventory`
--
ALTER TABLE `inventory`
  ADD CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`) ON DELETE CASCADE;

--
-- Constraints for table `inventory_checks`
--
ALTER TABLE `inventory_checks`
  ADD CONSTRAINT `inventory_checks_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `inventory_checks_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`location_id`),
  ADD CONSTRAINT `inventory_checks_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `inventory_check_items`
--
ALTER TABLE `inventory_check_items`
  ADD CONSTRAINT `inventory_check_items_ibfk_1` FOREIGN KEY (`inventory_check_id`) REFERENCES `inventory_checks` (`inventory_check_id`);

--
-- Constraints for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD CONSTRAINT `journal_entries_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `journal_entries_ibfk_2` FOREIGN KEY (`fiscal_period_id`) REFERENCES `fiscal_periods` (`fiscal_period_id`),
  ADD CONSTRAINT `journal_entries_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `journal_entry_lines`
--
ALTER TABLE `journal_entry_lines`
  ADD CONSTRAINT `journal_entry_lines_ibfk_1` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`journal_entry_id`),
  ADD CONSTRAINT `journal_entry_lines_ibfk_2` FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts` (`account_id`),
  ADD CONSTRAINT `journal_entry_lines_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`location_id`);

--
-- Constraints for table `locations`
--
ALTER TABLE `locations`
  ADD CONSTRAINT `locations_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `locations_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`);

--
-- Constraints for table `manufacturing_batches`
--
ALTER TABLE `manufacturing_batches`
  ADD CONSTRAINT `manufacturing_batches_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `manufacturing_batches_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `manufacturing_materials`
--
ALTER TABLE `manufacturing_materials`
  ADD CONSTRAINT `manufacturing_materials_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `manufacturing_batches` (`batch_id`),
  ADD CONSTRAINT `manufacturing_materials_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`location_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `payment_terms`
--
ALTER TABLE `payment_terms`
  ADD CONSTRAINT `payment_terms_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL;

--
-- Constraints for table `product_price_history`
--
ALTER TABLE `product_price_history`
  ADD CONSTRAINT `product_price_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `fk_product_variants_branch_id` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_product_variants_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_variant_base_unit` FOREIGN KEY (`base_unit_id`) REFERENCES `units` (`unit_id`),
  ADD CONSTRAINT `fk_variant_package_unit` FOREIGN KEY (`package_unit_id`) REFERENCES `units` (`unit_id`),
  ADD CONSTRAINT `fk_variant_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`unit_id`),
  ADD CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`),
  ADD CONSTRAINT `purchase_orders_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`po_id`);

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reports_ibfk_3` FOREIGN KEY (`generated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `roles`
--
ALTER TABLE `roles`
  ADD CONSTRAINT `fk_roles_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `roles_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE CASCADE;

--
-- Constraints for table `sales_orders`
--
ALTER TABLE `sales_orders`
  ADD CONSTRAINT `sales_orders_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `sales_orders_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `sales_orders_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `sales_orders_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `sales_order_items`
--
ALTER TABLE `sales_order_items`
  ADD CONSTRAINT `sales_order_items_ibfk_1` FOREIGN KEY (`so_id`) REFERENCES `sales_orders` (`so_id`);

--
-- Constraints for table `sales_returns`
--
ALTER TABLE `sales_returns`
  ADD CONSTRAINT `sales_returns_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `sales_returns_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  ADD CONSTRAINT `sales_returns_ibfk_3` FOREIGN KEY (`so_id`) REFERENCES `sales_orders` (`so_id`),
  ADD CONSTRAINT `sales_returns_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `sales_return_items`
--
ALTER TABLE `sales_return_items`
  ADD CONSTRAINT `sales_return_items_ibfk_1` FOREIGN KEY (`sales_return_id`) REFERENCES `sales_returns` (`sales_return_id`);

--
-- Constraints for table `settings`
--
ALTER TABLE `settings`
  ADD CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE;

--
-- Constraints for table `shipments`
--
ALTER TABLE `shipments`
  ADD CONSTRAINT `shipments_ibfk_1` FOREIGN KEY (`so_id`) REFERENCES `sales_orders` (`so_id`),
  ADD CONSTRAINT `shipments_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `shipments_ibfk_3` FOREIGN KEY (`shipped_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `shipment_items`
--
ALTER TABLE `shipment_items`
  ADD CONSTRAINT `shipment_items_ibfk_1` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`shipment_id`),
  ADD CONSTRAINT `shipment_items_ibfk_2` FOREIGN KEY (`so_item_id`) REFERENCES `sales_order_items` (`so_item_id`),
  ADD CONSTRAINT `shipment_items_ibfk_5` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`location_id`);

--
-- Constraints for table `stock_adjustments`
--
ALTER TABLE `stock_adjustments`
  ADD CONSTRAINT `stock_adjustments_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `stock_adjustments_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`location_id`),
  ADD CONSTRAINT `stock_adjustments_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `stock_levels`
--
ALTER TABLE `stock_levels`
  ADD CONSTRAINT `stock_levels_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `stock_levels_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`location_id`);

--
-- Constraints for table `stock_locations`
--
ALTER TABLE `stock_locations`
  ADD CONSTRAINT `stock_locations_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `stock_locations_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL;

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `stock_movements_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `stock_locations` (`location_id`),
  ADD CONSTRAINT `stock_movements_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  ADD CONSTRAINT `stock_transfers_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `stock_transfers_ibfk_2` FOREIGN KEY (`source_location_id`) REFERENCES `stock_locations` (`location_id`),
  ADD CONSTRAINT `stock_transfers_ibfk_3` FOREIGN KEY (`destination_location_id`) REFERENCES `stock_locations` (`location_id`),
  ADD CONSTRAINT `stock_transfers_ibfk_4` FOREIGN KEY (`requested_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `stock_transfers_ibfk_5` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `stock_transfer_items`
--
ALTER TABLE `stock_transfer_items`
  ADD CONSTRAINT `stock_transfer_items_ibfk_1` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers` (`transfer_id`);

--
-- Constraints for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD CONSTRAINT `suppliers_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `supplier_bills`
--
ALTER TABLE `supplier_bills`
  ADD CONSTRAINT `supplier_bills_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `supplier_bills_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`),
  ADD CONSTRAINT `supplier_bills_ibfk_3` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`po_id`),
  ADD CONSTRAINT `supplier_bills_ibfk_4` FOREIGN KEY (`payment_term_id`) REFERENCES `payment_terms` (`payment_term_id`),
  ADD CONSTRAINT `supplier_bills_ibfk_5` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `supplier_bill_items`
--
ALTER TABLE `supplier_bill_items`
  ADD CONSTRAINT `supplier_bill_items_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `supplier_bills` (`bill_id`),
  ADD CONSTRAINT `supplier_bill_items_ibfk_3` FOREIGN KEY (`tax_code_id`) REFERENCES `tax_codes` (`tax_code_id`);

--
-- Constraints for table `supplier_payments`
--
ALTER TABLE `supplier_payments`
  ADD CONSTRAINT `supplier_payments_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `supplier_payments_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`),
  ADD CONSTRAINT `supplier_payments_ibfk_3` FOREIGN KEY (`cash_account_id`) REFERENCES `cash_accounts` (`cash_account_id`),
  ADD CONSTRAINT `supplier_payments_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `supplier_payment_allocations`
--
ALTER TABLE `supplier_payment_allocations`
  ADD CONSTRAINT `supplier_payment_allocations_ibfk_1` FOREIGN KEY (`supplier_payment_id`) REFERENCES `supplier_payments` (`supplier_payment_id`),
  ADD CONSTRAINT `supplier_payment_allocations_ibfk_2` FOREIGN KEY (`bill_id`) REFERENCES `supplier_bills` (`bill_id`);

--
-- Constraints for table `tax_codes`
--
ALTER TABLE `tax_codes`
  ADD CONSTRAINT `tax_codes_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

--
-- Constraints for table `tax_rates`
--
ALTER TABLE `tax_rates`
  ADD CONSTRAINT `tax_rates_ibfk_1` FOREIGN KEY (`tax_code_id`) REFERENCES `tax_codes` (`tax_code_id`);

--
-- Constraints for table `tools`
--
ALTER TABLE `tools`
  ADD CONSTRAINT `fk_tool_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `fk_tool_category` FOREIGN KEY (`category_id`) REFERENCES `tool_categories` (`category_id`),
  ADD CONSTRAINT `fk_tool_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`),
  ADD CONSTRAINT `fk_tool_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`);

--
-- Constraints for table `tool_categories`
--
ALTER TABLE `tool_categories`
  ADD CONSTRAINT `fk_toolcat_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_toolcat_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_toolcat_parent` FOREIGN KEY (`parent_id`) REFERENCES `tool_categories` (`category_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `units`
--
ALTER TABLE `units`
  ADD CONSTRAINT `units_ibfk_1` FOREIGN KEY (`base_unit_id`) REFERENCES `units` (`unit_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `users_ibfk_3` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `users_ibfk_4` FOREIGN KEY (`invited_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `user_invitations`
--
ALTER TABLE `user_invitations`
  ADD CONSTRAINT `user_invitations_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_invitations_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_invitations_ibfk_3` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  ADD CONSTRAINT `user_invitations_ibfk_4` FOREIGN KEY (`invited_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_roles_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
