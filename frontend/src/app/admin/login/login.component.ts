import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

// Importações necessárias para o template
import { CommonModule } from '@angular/common'; // Para *ngIf
import { FormsModule } from '@angular/forms'; // Para [(ngModel)]

@Component({
  selector: 'app-login',
  imports: [
    CommonModule, // Disponibiliza *ngIf, *ngFor, etc.
    FormsModule   // Disponibiliza [(ngModel)]
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  credentials = { email: '', password: '' };
  error: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit(): void {
    console.log("Iniciado processo de autenticação com o backend.");

    this.authService.login(this.credentials).subscribe({
      next: () => {
        // Sucesso no login, navega para o dashboard
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        // Erro no login, exibe mensagem
        this.error = 'Credenciais inválidas. Tente novamente.';
        console.error(err);
      }
    });
  }
}