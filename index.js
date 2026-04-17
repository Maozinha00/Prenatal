const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

const CATEGORY_ID = "1492387782394515466";
const ACAO_CHANNEL_ID = "1477683906642706507";

// ===== BANCO =====
function loadDB() {
  try {
    if (!fs.existsSync("database.json")) return {};
    return JSON.parse(fs.readFileSync("database.json"));
  } catch {
    return {};
  }
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

client.once("ready", () => {
  console.log(`🏥 Hospital ONLINE: ${client.user.tag}`);
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {

  try {

    // PAINEL
    if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("iniciar")
          .setLabel("🤰 Iniciar Atendimento")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: "🏥 Sistema Hospitalar",
        components: [row]
      });
    }

    // INICIAR PACIENTE
    if (interaction.isButton() && interaction.customId === "iniciar") {

      const modal = new ModalBuilder()
        .setCustomId("inicio")
        .setTitle("Cadastro da Paciente");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Nome").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("idade").setLabel("Idade").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("rg").setLabel("RG").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("bebes").setLabel("Qtd bebês (1 ou 2)").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sexo").setLabel("Sexo bebê").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // SALVAR PACIENTE
    if (interaction.isModalSubmit() && interaction.customId === "inicio") {

      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const db = loadDB();
      const id = Date.now().toString();

      const canalCriado = await interaction.guild.channels.create({
        name: `🩺-${interaction.fields.getTextInputValue("nome")}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      db[id] = {
        nome: interaction.fields.getTextInputValue("nome"),
        idade: interaction.fields.getTextInputValue("idade"),
        rg: interaction.fields.getTextInputValue("rg"),
        bebes: interaction.fields.getTextInputValue("bebes"),
        sexo: interaction.fields.getTextInputValue("sexo"),
        consultas: [],
        channelId: canalCriado.id
      };

      saveDB(db);

      const canalAcoes = interaction.guild.channels.cache.get(ACAO_CHANNEL_ID);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`consulta_${id}`)
          .setLabel(`➕ Consulta`)
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`parto_${id}`)
          .setLabel("🏥 Parto")
          .setStyle(ButtonStyle.Danger)
      );

      if (canalAcoes) {
        await canalAcoes.send({
          content: `👩 Paciente: **${db[id].nome}**`,
          components: [row]
        });
      }

      return interaction.editReply({
        content: "✅ Paciente registrada!"
      });
    }

    // CONSULTA
    if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {

      const id = interaction.customId.split("_")[1];

      const modal = new ModalBuilder()
        .setCustomId(`consulta_${id}`)
        .setTitle("Consulta Pré-Natal");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("sintomas")
            .setLabel("Sintomas")
            .setStyle(TextInputStyle.Paragraph)
        )
      );

      return interaction.showModal(modal);
    }

    // FINAL CONSULTA
    if (interaction.isModalSubmit() && interaction.customId.startsWith("consulta_")) {

      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const id = interaction.customId.split("_")[1];
      const db = loadDB();

      db[id].consultas.push({
        data: new Date().toLocaleDateString(),
        hora: new Date().toLocaleTimeString(),
        sintomas: interaction.fields.getTextInputValue("sintomas")
      });

      saveDB(db);

      const total = db[id].consultas.length;

      let lista = "";
      for (let i = 1; i <= 17; i++) {
        lista += `${db[id].consultas[i - 1] ? "✅" : "⬜"} ${i}º Pré-natal\n`;
      }

      let historico = "";
      db[id].consultas.forEach((c, i) => {
        historico += `\n${i + 1}º - ${c.data} ${c.hora}: ${c.sintomas}`;
      });

      const ficha = `
# 🤰📋 PRÉ-NATAL

👩 Nome: ${db[id].nome}
🎂 Idade: ${db[id].idade}
🆔 RG: ${db[id].rg}

---

## 📊 CONSULTAS

${lista}

---

## 🩺 HISTÓRICO

${historico}
`;

      try {
        const canal = interaction.guild.channels.cache.get(db[id].channelId);
        if (canal) await canal.send(ficha);
      } catch (e) {
        console.log("Erro envio ficha:", e);
      }

      return interaction.editReply({
        content: `✅ Consulta ${total}/17 registrada!`
      });
    }

    // ================= PARTO (CORRIGIDO) =================
    if (interaction.isButton() && interaction.customId.startsWith("parto_")) {

      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const id = interaction.customId.split("_")[1];
      const db = loadDB();

      const p = db[id];

      if (!p) {
        return interaction.editReply("❌ Paciente não encontrada!");
      }

      const data = new Date().toLocaleDateString();
      const hora = new Date().toLocaleTimeString();

      let lista = "";
      for (let i = 1; i <= 17; i++) {
        lista += `${p.consultas[i - 1] ? "✅" : "⬜"} ${i}º Pré-natal\n`;
      }

      const relatorio = `
# 🏥🤱 PARTO FINAL

👩 Mãe: ${p.nome}
🎂 Idade: ${p.idade}
🆔 RG: ${p.rg}

👶 Sexo: ${p.sexo}

📅 Data: ${data}
⏰ Hora: ${hora}
👨‍⚕️ Médico: ${interaction.user}

---

## 📊 PRÉ-NATAL

${lista}

✔️ PARTO FINALIZADO
`;

      try {
        const canal = interaction.guild.channels.cache.get(p.channelId);
        if (canal) await canal.send(relatorio);
      } catch (e) {
        console.log("Erro parto:", e);
      }

      return interaction.editReply({
        content: "🏥 Parto registrado com sucesso!"
      });
    }

  } catch (err) {
    console.log("ERRO GLOBAL:", err);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ Erro interno no sistema.",
        ephemeral: true
      });
    }
  }

});

client.login(TOKEN);
