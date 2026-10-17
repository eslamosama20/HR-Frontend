# Frontend E2E Integration Checklist

This checklist acts as a formal guide to verify the End-to-End Simulation + Testing Layer for the POS & Pharmacy system.

## Flow 1: Pharmacy Full Flow
**Description:** Full lifecycle of a prescription from inventory arrival to patient delivery.

- [ ] **Step 1: Inventory & Batches**
  - Verify batches load correctly from `getBatches()`.
  - Try quarantining a batch. *Expected*: State changes to quarantined, UI updates gracefully.
- [ ] **Step 2: Prescription Workbench**
  - Verify prescription list loads.
- [ ] **Step 3: Interactions Review**
  - Load the interactions list.
  - Approve an override. *Expected*: State changes to `approved_override`.
  - Simulate a block action.
- [ ] **Step 4: Ready Queue & Checkout**
  - Verify the ready prescription appears in POS.
  - Trigger `checkoutPrescription()` with missing session. *Expected*: `mapCheckoutError` returns `NO_ACTIVE_SESSION`.
  - Trigger successful checkout. *Expected*: Invoice is generated, UI shows success message.

## Flow 2: POS Normal Sale
**Description:** Standard retail transaction without pharmacy strictness.

- [ ] **Step 1: Open Session**
  - Verify session state is active.
- [ ] **Step 2: Add Product**
  - Add standard product to cart.
- [ ] **Step 3: Calculate & Checkout**
  - Proceed to checkout. *Expected*: Successful payment and invoice receipt generated.
- [ ] **Step 4: Simulate Failure**
  - Force a network failure during checkout. *Expected*: Transaction halts, warning displayed, retry available.

## Flow 3: Salla Integration
**Description:** External e-commerce order ingestion.

- [ ] **Step 1: Import Order**
  - View pending Salla orders list.
  - Click import on an order.
  - Simulate success. *Expected*: Order moves to processing state.
  - Simulate API failure. *Expected*: Order stays pending, detailed error alert appears.

## Simulation Environment Configuration
Ensure `simulateBackend: true` is set in your environment file before running these checklists. Adjust the `simulateError` flag in the `SimulationOptions` to test the failure scenarios.
