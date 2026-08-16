import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'doc-api-reference',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>API Reference</h1>
    <p>Base path convention: <code>/api/&lt;resource&gt;</code>. Auth endpoints are unprefixed and public.</p>

    <h2>Auth</h2>
    <table class="doc-table">
      <thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>POST</td><td>/authenticate</td><td>Login → JWT</td></tr>
        <tr><td>POST</td><td>/sign-up</td><td>Registration</td></tr>
        <tr><td>POST</td><td>/refresh-token</td><td>Renew JWT</td></tr>
        <tr><td>POST</td><td>/forgot-password</td><td>Send reset email</td></tr>
        <tr><td>POST</td><td>/reset-password</td><td>Complete reset</td></tr>
        <tr><td>POST</td><td>/verify-email</td><td>Confirm email</td></tr>
        <tr><td>POST</td><td>/resend-verification</td><td>Re-send verification</td></tr>
        <tr><td>POST</td><td>/auth/google</td><td>Google ID token → app JWT</td></tr>
      </tbody>
    </table>

    <h2>Bills — /api/bill</h2>
    <table class="doc-table">
      <thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>POST</td><td>/add</td><td>Legacy single-call bill creation</td></tr>
        <tr><td>POST</td><td>/search</td><td>Paginated/filterable search</td></tr>
        <tr><td>GET</td><td>/{{'{'}}billId{{'}'}}</td><td>Fetch one bill</td></tr>
        <tr><td>GET</td><td>/user</td><td>All bills for current user</td></tr>
        <tr><td>DELETE</td><td>/delete/{{'{'}}billId{{'}'}}</td><td>Delete bill + items</td></tr>
        <tr><td>PATCH</td><td>/{{'{'}}billId{{'}'}}/paid</td><td>Toggle paid status</td></tr>
      </tbody>
    </table>

    <h2>PDF & export — /api/pdf</h2>
    <table class="doc-table">
      <thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>GET</td><td>/bill/{{'{'}}billId{{'}'}}</td><td>Single invoice PDF</td></tr>
        <tr><td>POST</td><td>/bills/zip</td><td>Bulk export as ZIP</td></tr>
      </tbody>
    </table>

    <h2>Other resources</h2>
    <table class="doc-table">
      <thead><tr><th>Area</th><th>Base path</th><th>Notable endpoints</th></tr></thead>
      <tbody>
        <tr><td>Products</td><td>/api/product</td><td>add, all, get, search, edit, delete, bulk</td></tr>
        <tr><td>Stock</td><td>/api/stock</td><td>add, user, search, update, delete, inventory-value</td></tr>
        <tr><td>Stock logs</td><td>/api/stock-logs</td><td>{{'{'}}stockId{{'}'}}, user</td></tr>
        <tr><td>Purchasers</td><td>/api/purchaser</td><td>search, save, page, delete</td></tr>
        <tr><td>Sales</td><td>/api/sales</td><td>summary, top-products, monthly, yearly, years</td></tr>
        <tr><td>Product requests</td><td>/api/product-requests</td><td>submit, my, pending, all, approve, reject</td></tr>
        <tr><td>Business details</td><td>/api/details</td><td>create, get, update, delete</td></tr>
        <tr><td>Logo</td><td>/api/logo</td><td>Serves current business logo</td></tr>
        <tr><td>OCR</td><td>/api/ocr/scan</td><td>Label scan forwarding</td></tr>
        <tr><td>Postal</td><td>/api/postal</td><td>Pincode/district/state lookups</td></tr>
        <tr><td>Profile</td><td>/api/user/profile</td><td>get/patch, change-password</td></tr>
      </tbody>
    </table>
  `
})
export class ApiReferenceComponent {}