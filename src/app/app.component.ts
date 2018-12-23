import { Component } from '@angular/core';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const StatusCodes = {
  reckognizeIntent: 0,
  checkDocument: 1,
  invalid: 2,
  unregistered: 3,
  registered: 4,
  invalidCode: 5,
  validCode: 6,
  validationCodeSent: 7,
  validationCodeSentMaxAttempsExceeded: 8,
  validationCodeSentError: 9,
  underage: 10,
  titularNoContacts: 11,
  dependentNoContacts: 12,
  sendEmailSuccess: 13,
  sendEmailError: 14,
  sendEmailDeny: 15,
  localPhone: 16
};

const Intents = {
  none: 0,
  startBot: 1,
  checkSubscriptionStatus: 2,
  checkValidationCode: 3,
  sendValidationCode: 4,
  sendEmail: 5,
  selectEmail: 6,
  selectSMS: 7
}

@Injectable()
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private title = 'chatbot-client';
  private chat = [];
  private url = 'https://prxrjh7i6b.execute-api.us-east-1.amazonaws.com/DEV/bot';
  private status = StatusCodes.reckognizeIntent;
  private missedMessage = 'Desculpe, eu não entendi o que você disse. Você pode repetir, por favor?';
  private attemps = 1;
  private intent = Intents.none;
  private botThinking = false;

  constructor(private http: HttpClient) {
  }

  private getMessageClass(sender) {
    return (sender === 'bot') ? 'badge badge-info' : 'badge badge-secondary';
  }

  private getTimestamp() {
    return new Date().toLocaleString();
  }

  private getBotResponse(intent, bodyRequest) {
    return new Promise((resolve, reject) => {
      const params = {
        intent,
        bodyRequest
      };

      try {
        this.http.post(this.url, params).subscribe(data => {
          resolve(data);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private async onSendMessage(event) {
    if (event.key === "Enter" && event.target.value.length > 0) {
      this.botThinking = true;

      this.chat.unshift({
        text: event.target.value,
        sender: 'app',
        timestamp: this.getTimestamp()
      });

      this.chat.unshift({
        text: '',
        sender: 'bot',
        timestamp: this.getTimestamp()
      });

      let response;

      // bot primeiro tenta entender
      response = await this.getBotResponse(event.target.value, {
        attemps: this.attemps.toString(),
        inboundStatus: this.status.toString()
      });

      // atualiza o número de tentativas
      if (response.attributes && response.attributes.attemps) {
        this.attemps = parseInt(response.attributes.attemps);
      }

      console.log('before status', this.status);

      // bot não conseguiu entender
      if (response.botResponse === this.missedMessage) {
        // checa status e verifica chamadas específicas
        switch (this.status) {
          case StatusCodes.checkDocument:
          case StatusCodes.invalid:
          case StatusCodes.titularNoContacts:
            response = await this.getBotResponse('status', {
              document: event.target.value,
              attemps: this.attemps.toString(),
              inboundStatus: this.status.toString()
            });
            break;
          case StatusCodes.unregistered:
          case StatusCodes.invalidCode:
          case StatusCodes.validationCodeSent:
          case StatusCodes.sendEmailSuccess:
          case StatusCodes.validationCodeSentMaxAttempsExceeded:
            response = await this.getBotResponse('validar código', {
              validationCode: event.target.value,
              attemps: this.attemps.toString(),
              inboundStatus: this.status.toString()
            });
            break;
          case StatusCodes.dependentNoContacts:
            response = await this.getBotResponse(`liamednes ${event.target.value}`, {
              attemps: this.attemps.toString(),
              inboundStatus: this.status.toString()
            });
          case StatusCodes.reckognizeIntent:
          case StatusCodes.registered:
          case StatusCodes.validCode:
          case StatusCodes.validationCodeSentError:
          case StatusCodes.underage:
          case StatusCodes.sendEmailError:
          case StatusCodes.localPhone:
          case StatusCodes.sendEmailDeny:
            break;
        }
      }

      this.chat[0].text = response.botResponse;
      this.status = parseInt((response.attributes && response.attributes.statusCode) || '0');

      // atualiza o número de tentativas
      if (response.attributes && response.attributes.attemps) {
        this.attemps = parseInt(response.attributes.attemps);
      }

      console.log(response);

      console.log('after status', this.status);

      event.target.value = '';

      this.botThinking = false;
    }
  }

  private getBotIcon() {
    return this.botThinking ? 'fas fa-robot fa-spin' : 'fas fa-robot';
  }

  private onClearChat() {
    this.chat = [];
    this.status = StatusCodes.reckognizeIntent;
    this.intent = Intents.none;
    this.attemps = 1;
    this.botThinking = false;
  }
}
