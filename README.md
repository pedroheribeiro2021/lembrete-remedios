# Meus Remédios

App web simples (PWA) para lembrar horários de remédio, saber qual remédio é qual em cada horário, e marcar que já tomou.

## Como usar

Não precisa de build nem instalação — é HTML/CSS/JS puro. Para rodar localmente, sirva a pasta com qualquer servidor estático, por exemplo:

```bash
npx serve .
```

ou

```bash
python -m http.server 5500
```

Depois abra o endereço mostrado no navegador. No celular, abra o mesmo endereço na rede local e use "Adicionar à tela inicial" para instalar como app (PWA).

## Funcionalidades

- Cadastro de remédios com nome, dose/observação e um ou mais horários.
- Lista "Horários de hoje" mostrando todos os horários do dia em ordem, com o remédio de cada um, status (pendente / atrasado / tomado) e um botão para marcar "Tomei".
- Histórico por dia salvo automaticamente (fica marcado mesmo se você recarregar a página).
- **Alarme de verdade (Android)**: cada horário tem um botão "⏰ Criar alarme" que abre o app de Relógio nativo do Android já preenchido com o horário e o nome do remédio. Você confirma o salvamento uma vez (e pode marcar "repetir todos os dias") — dali em diante é o alarme nativo do aparelho tocando, com som alto, vibração e prioridade sobre o modo silencioso. Só aparece em navegadores Android.
- Lembrete sonoro + notificação do navegador enquanto a página está aberta, como reforço (repete a cada 5 minutos enquanto não for marcado, por até 1 hora).

## Limitação importante

O botão "⏰ Criar alarme" resolve o problema de tocar alto mesmo com o celular fechado/travado, porque delega isso ao alarme nativo do Android — a web não tem acesso ao `AlarmManager` do sistema, então essa é a única forma confiável.

Já o lembrete sonoro embutido no app (Notification API + temporizador na página) só funciona enquanto a aba/app estiver aberto (pode estar minimizado), e **não dispara se o navegador estiver totalmente fechado** — sirva apenas como reforço visual/sonoro para quando você já está com o app aberto. Não há servidor por trás; tudo é salvo localmente no navegador (`localStorage`), então os dados não sincronizam entre dispositivos diferentes.
