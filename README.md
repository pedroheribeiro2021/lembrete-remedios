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
- **Alarme de verdade (Android)**: cada horário tem um botão "⏰ Criar alarme" que tenta abrir o app de Relógio nativo do Android já preenchido com o horário e o nome do remédio (e copia esses dados para a área de transferência como plano B). Você confirma o salvamento uma vez (e pode marcar "repetir todos os dias") — dali em diante é o alarme nativo do aparelho tocando, com som alto, vibração e prioridade sobre o modo silencioso. Só aparece em navegadores Android.
- **Ver/editar alarmes no Relógio (Android)**: um botão no topo abre direto a lista de alarmes do app de Relógio nativo, para editar ou apagar um alarme que você já criou.

O app **não tem nenhum som, notificação ou verificação em segundo plano** — ele só faz alguma coisa quando você está com a página aberta e toca em um botão. Isso foi uma decisão deliberada: uma versão anterior tinha um lembrete sonoro embutido (checagem a cada 20s + beep), mas uma aba esquecida aberta em segundo plano ficava apitando sozinha sem o usuário perceber de onde vinha. Removido por completo — quem faz o papel de "alarme de verdade" agora é só o alarme nativo do Android (botão "Criar alarme").

## Limitações importantes

**Editar/apagar um alarme já criado só pode ser feito dentro do próprio app de Relógio.** É uma restrição de segurança do Android: nenhum site e nenhum app de terceiros — nem o nosso, nem qualquer outro — tem permissão para ler ou alterar os alarmes que pertencem a outro app. Por isso existe o botão "Ver/editar alarmes no Relógio", que só leva você até lá; a edição em si é feita na tela nativa do Android.

**O botão "Criar alarme" pode não funcionar em todo aparelho.** Ele usa um comando padrão do Android (`SET_ALARM`) que a maioria dos apps de Relógio aceita, mas alguns apps de fabricante (certas versões de Xiaomi/MIUI, Motorola, Samsung) não respondem a esse comando — e o Android não avisa nada quando isso acontece, o toque simplesmente não tem efeito. Por isso o botão copia o horário e o nome do remédio para a área de transferência antes de tentar: se o preenchimento automático falhar, abra o Relógio manualmente (pelo botão "Ver/editar alarmes") e cole/digite os dados já copiados.

Não há servidor por trás; tudo é salvo localmente no navegador (`localStorage`), então os dados não sincronizam entre dispositivos diferentes.
