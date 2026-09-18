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
- Lembrete sonoro + notificação do navegador quando chega a hora de um remédio ainda não tomado (repete a cada 5 minutos enquanto não for marcado, por até 1 hora).

## Limitação importante

Os lembretes usam a *Notification API* do navegador e um temporizador dentro da própria página. Isso funciona enquanto a aba/app estiver aberto (pode estar minimizado ou em outra aba), mas **não dispara se o navegador estiver totalmente fechado**. Não há servidor por trás — tudo roda e é salvo localmente no seu navegador (`localStorage`), então os dados não sincronizam entre dispositivos diferentes.

Se no futuro for importante ter alarme mesmo com o navegador fechado, o caminho é um app nativo/híbrido (ex: React Native) com notificações agendadas pelo sistema operacional.
