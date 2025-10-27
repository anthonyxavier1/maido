import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatbotService } from '../../services/chatbot.service';

interface ChatMessage {
  from: 'user' | 'bot';
  text: string;
  time: string;
  buttons?: { label: string; value: string; route?: string; link?: string }[];
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  isOpen = false;
  isTyping = false;
  messages: ChatMessage[] = [];
  userInput = '';

  private STORAGE_KEY = 'chatbot_maido_history';
  private GREETING_SHOWN_KEY = 'chatbot_maido_greeting_shown';

  constructor(private chatbotService: ChatbotService, private router: Router) {}

  ngOnInit() {
    // 🧠 Cargar historial guardado
    const savedHistory = localStorage.getItem(this.STORAGE_KEY);
    if (savedHistory) {
      try {
        this.messages = JSON.parse(savedHistory);
      } catch {
        this.messages = [];
      }
    }

    // 👋 Mostrar saludo inicial solo la primera vez
    const greetingShown = localStorage.getItem(this.GREETING_SHOWN_KEY);
    if (!greetingShown) {
      setTimeout(() => {
        this.addBotMessage('👋 ¡Hola! Soy el asistente de Maido 🍣');
        this.addBotMessage('¿Qué deseas hacer hoy?', false, [
          { label: 'Ver Menú 🍱', value: 'ver menú', route: '/menu' },
          { label: 'Reservar 🕰️', value: 'hacer reserva', route: '/reserva' },
          { label: 'Experiencias ✨', value: 'ver experiencias', route: '/menu' } // ✅ ajustado
        ]);
        localStorage.setItem(this.GREETING_SHOWN_KEY, 'true');
      }, 800);
    }
  }

  ngOnDestroy() {
    this.saveChatHistory();
  }

  /** 🕒 Obtener hora actual en formato 12h */
  private getCurrentTime(): string {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.scrollToBottom();
  }

  /** ✉️ Enviar mensaje del usuario o botón */
  async sendMessage(text?: string, route?: string, link?: string) {
    const messageText = text || this.userInput.trim();
    if (!messageText) return;

    // 🧍‍♂️ Agregar mensaje del usuario
    const userMessage: ChatMessage = {
      from: 'user',
      text: messageText,
      time: this.getCurrentTime()
    };
    this.messages.push(userMessage);
    this.saveChatHistory();
    this.scrollToBottom();

    // 🚀 Si el botón tiene ruta interna
    if (route) {
      this.router.navigate([route]);
      this.isOpen = false;
      return;
    }

    // 🌐 Si el botón tiene link externo
    if (link) {
      window.open(link, '_blank');
      return;
    }

    // 💬 Petición al bot
    this.userInput = '';
    this.isTyping = true;

    try {
      const botReply = await this.chatbotService.sendMessage(messageText);
      this.isTyping = false;

      // Detectar enlaces externos y convertirlos en botones
      const linkRegex = /(https?:\/\/[^\s]+)/g;
      const foundLinks = botReply.match(linkRegex);

      if (foundLinks) {
        const buttons = foundLinks.map((url) => ({
          label: 'Abrir enlace 🔗',
          value: 'Abrir enlace',
          link: url
        }));
        this.addBotMessage(botReply.replace(linkRegex, '').trim(), true, buttons);
      } else {
        this.addBotMessage(botReply);
      }
    } catch {
      this.isTyping = false;
      this.addBotMessage('⚠️ Ocurrió un problema. Intenta nuevamente.');
    }
  }

  /** 🤖 Agregar mensaje del bot */
  private addBotMessage(
    text: string,
    save = true,
    buttons?: { label: string; value: string; route?: string; link?: string }[]
  ) {
    const botMessage: ChatMessage = {
      from: 'bot',
      text,
      time: this.getCurrentTime(),
      buttons
    };
    this.messages.push(botMessage);
    if (save) this.saveChatHistory();
    this.scrollToBottom();
  }

  /** 💾 Guardar historial */
  private saveChatHistory() {
    if (this.messages.length > 0) {
      const trimmed = this.messages.slice(-50);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
    }
  }

  /** 🔽 Scroll automático */
  private scrollToBottom() {
    setTimeout(() => {
      const chatBody = document.querySelector('.chat-body');
      if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
    }, 100);
  }
}
