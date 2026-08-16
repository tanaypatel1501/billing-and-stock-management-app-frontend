import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocDiagramComponent } from '../../shared/doc-diagram/doc-diagram.component';
import { DocCalloutComponent } from '../../shared/doc-callout/doc-callout.component';

@Component({
  selector: 'doc-database',
  standalone: true,
  imports: [CommonModule, DocDiagramComponent, DocCalloutComponent],
  template: `
    <h1>Database Schema</h1>
    <p>Relationship map of the core entities. Column lists are non-exhaustive — treat this as a structural reference, not a DDL source.</p>

    <doc-diagram [diagram]="erDiagram"></doc-diagram>

    <h2>Key design decisions</h2>

    <doc-callout type="info" title="Bill items snapshot product data">
      <code>BillItems</code> stores <code>snapshot_product_name</code>, <code>snapshot_hsn</code>,
      <code>snapshot_cgst</code>, <code>snapshot_sgst</code>, and <code>snapshot_unit_price</code> rather than
      joining live to <code>Product</code>. A bill issued today must always show the tax rate and price that
      applied <em>at the time</em>, even if the product's master data changes later. <code>product_id</code> is
      kept only as a nullable traceability reference.
    </doc-callout>

    <doc-callout type="info" title="Multi-tenancy via user_id + ownership checks">
      Every business-owned entity (<code>bill</code>, <code>stock</code>, <code>purchaser</code>,
      <code>details</code>, <code>product_request</code>) carries a <code>user_id</code> foreign key, enforced
      at the service/controller boundary via <code>SecurityUtils.requireOwnership()</code> — this is what
      prevents one business's data from being visible to another's authenticated session.
    </doc-callout>

    <doc-callout type="warning" title="Row-locked stock decrement">
      <code>submitBillWithItems</code> uses a pessimistic row lock
      (<code>stockRepository.findByIdForUpdate(...)</code>) before checking and decrementing quantity — this
      prevents two concurrent bill submissions from both reading stale stock and overselling the same batch.
    </doc-callout>

    <doc-callout type="success" title="Append-only stock audit trail">
      <code>StockLog</code> writes a new row on every stock mutation (e.g. a <code>"SOLD"</code> entry linking
      back to the originating bill) — giving a per-batch history independent of the mutable
      <code>Stock.quantity</code> column.
    </doc-callout>

    <h2>Entities</h2>

    <h3>users</h3>
    <table class="doc-table">
      <thead><tr><th>Column</th><th>Type</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>id</td><td>bigint</td><td>PK</td></tr>
        <tr><td>email</td><td>varchar</td><td></td></tr>
        <tr><td>password</td><td>varchar</td><td>BCrypt hash</td></tr>
        <tr><td>google_id</td><td>varchar</td><td>Set on Google Sign-In linking</td></tr>
        <tr><td>email_verified</td><td>boolean</td><td>Blocks login until true</td></tr>
        <tr><td>verification_token</td><td>varchar</td><td></td></tr>
        <tr><td>verification_token_expiry</td><td>datetime</td><td></td></tr>
        <tr><td>user_role</td><td>enum</td><td>ADMIN | USER</td></tr>
      </tbody>
    </table>

    <h3>details</h3>
    <p>One-to-one business profile per user — company name, address, GSTIN, bank details, UPI ID, and invoice preferences (tax mode, preferred template).</p>

    <h3>bill</h3>
    <table class="doc-table">
      <thead><tr><th>Column</th><th>Type</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>id</td><td>bigint</td><td>PK</td></tr>
        <tr><td>user_id</td><td>bigint</td><td>FK → users</td></tr>
        <tr><td>purchaser_id</td><td>bigint</td><td>FK → purchaser (nullable)</td></tr>
        <tr><td>invoice_date</td><td>datetime</td><td>Used for filenames and filtering</td></tr>
        <tr><td>total_amount</td><td>double</td><td>Computed on submit</td></tr>
        <tr><td>paid</td><td>boolean</td><td></td></tr>
      </tbody>
    </table>

    <h3>bill_items</h3>
    <p>Snapshot fields (see callout above) plus <code>quantity</code>, <code>free</code>, <code>rate</code>, <code>amount</code>, <code>batch_no</code>, <code>expiry_date</code>.</p>

    <h3>product / stock / stock_log</h3>
    <p><code>product</code> holds master catalog data (name, packing, HSN, MRP, CGST/SGST). <code>stock</code> represents a batch of a product owned by a specific user (quantity, batch number, expiry date). <code>stock_log</code> is the append-only history per stock row.</p>

    <h3>purchaser</h3>
    <p>Customer records scoped per user — name, DL numbers, GSTIN.</p>

    <h3>product_request</h3>
    <p>User-submitted requests for new catalog products, reviewed by an admin (<code>PENDING</code> / <code>APPROVED</code> / <code>REJECTED</code>).</p>
  `
})
export class DatabaseComponent {
  erDiagram = `
erDiagram
    USERS ||--o| DETAILS : "has profile"
    USERS ||--o{ BILL : creates
    USERS ||--o{ STOCK : owns
    USERS ||--o{ PURCHASER : manages
    USERS ||--o{ PRODUCT_REQUEST : submits
    BILL ||--o{ BILL_ITEMS : contains
    BILL }o--o| PURCHASER : "billed to"
    PRODUCT ||--o{ STOCK : "stocked as"
    PRODUCT ||--o{ BILL_ITEMS : "referenced by"
    STOCK ||--o{ STOCK_LOG : history
  `;
}