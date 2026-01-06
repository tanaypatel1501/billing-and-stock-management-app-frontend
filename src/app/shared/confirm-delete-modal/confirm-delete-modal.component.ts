import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faExclamationTriangle, faTrash, faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './confirm-delete-modal.component.html',
  styleUrls: ['./confirm-delete-modal.component.css']
})
export class ConfirmDeleteModalComponent {
  @Input() title: string = 'Confirm Delete';
  @Input() message: string = 'Are you sure you want to delete this item? This action cannot be undone.';
  
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  // FontAwesome Icons
  faExclamationTriangle = faExclamationTriangle;
  faTrash = faTrash;
  faTimes = faTimes;

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}