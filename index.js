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
const TOKEN = "MTQ5MjU1ODkyNDM2MzA3MTc4OQ.Gjdnob.e4uabOe63RanoFa1Qfrawcw_bbaJMrTgkBjEDs";

const CATEGORY_ID = "1492387782394515466";
const LOG_CHANNEL_ID = "1477683906642706506";

// ===== BANCO =====
function loadDB() {
  return JSON.parse(fs.readFileSync("database.json"));
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

// ===== READY =====
client.once("ready", () => {
  console.log(`🔥 Bot online: ${client.user.tag}`);
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {

  // 🔘 PAINEL
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("iniciar")
          .setLabel("🩺 Iniciar Consulta")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: "🏥 Painel Pré-Natal",
        components: [row]
      });
    }
  }

  // 🟢 BOTÃO
  if (interaction.isButton()) {
    if (interaction.customId === "iniciar") {

      const modal = new ModalBuilder()
        .setCustomId("form1")
        .setTitle("Dados da Paciente");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("nome")
            .setLabel("Nome")
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("rg")
            .setLabel("RG")
            .setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }
  }

  // 🧾 FORM
  if (interaction.isModalSubmit()) {

    const nome = interaction.fields.getTextInputValue("nome");
    const rg = interaction.fields.getTextInputValue("rg");

    const db = loadDB();

    if (!db.pacientes[rg]) {
      db.pacientes[rg] = {
        nome: nome,
        consultas: 0,
        canal: null
      };
    }

    db.pacientes[rg].consultas++;

    // 📁 CANAL
    let canal;

    if (db.pacientes[rg].canal) {
      canal = interaction.guild.channels.cache.get(db.pacientes[rg].canal);
    } else {
      canal = await interaction.guild.channels.create({
        name: `prenatal-${nome}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      db.pacientes[rg].canal = canal.id;
    }

    // 🏆 RANKING
    if (!db.medicos[interaction.user.id]) {
      db.medicos[interaction.user.id] = {
        nome: interaction.user.username,
        atendimentos: 0
      };
    }

    db.medicos[interaction.user.id].atendimentos++;

    saveDB(db);

    const numero = db.pacientes[rg].consultas;

    let lista = "";
    for (let i = 1; i <= 17; i++) {
      lista += `${i}º Pré-natal ${i === numero ? `: ${new Date().toLocaleDateString()}` : ""}\n`;
    }

    const relatorio = `
🤰📋 CHECK-IN DE PRÉ-NATAL

👩 Nome: ${nome}
🆔 RG: ${rg}

📅 Data: ${new Date().toLocaleDateString()}
👨‍⚕️ Médico: ${interaction.user}

📊 Histórico:
${lista}
`;

    canal.send(relatorio);

    const log = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
    log.send(relatorio);

    return interaction.reply({
      content: `✅ Consulta registrada em ${canal}`,
      ephemeral: true
    });
  }

});

client.login(TOKEN);