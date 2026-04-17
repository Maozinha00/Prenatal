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
const CATEGORY_ID = process.env.CATEGORY_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// ===== BANCO =====
function loadDB() {
  try {
    if (!fs.existsSync("database.json")) return {};
    const data = fs.readFileSync("database.json");
    return data.length ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

// ===== READY =====
client.once("ready", () => {
  console.log(`🔥 Hospital Online: ${client.user.tag}`);
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {

  // /painel
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("iniciar")
          .setLabel("🩺 Iniciar Atendimento")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: "🏥 SISTEMA HOSPITALAR",
        components: [row]
      });
    }
  }

  // INICIAR
  if (interaction.isButton() && interaction.customId === "iniciar") {

    const modal = new ModalBuilder()
      .setCustomId("form1")
      .setTitle("Paciente");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("nome").setLabel("Nome").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("rg").setLabel("RG").setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // FORM 1
  if (interaction.isModalSubmit() && interaction.customId === "form1") {

    const db = loadDB();
    const id = Date.now().toString();

    db[id] = {
      nome: interaction.fields.getTextInputValue("nome"),
      rg: interaction.fields.getTextInputValue("rg"),
      consultas: 0
    };

    saveDB(db);

    const canal = await interaction.guild.channels.create({
      name: `paciente-${db[id].nome}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`consulta_${id}`)
        .setLabel("📋 Nova Consulta")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`finalizar_${id}`)
        .setLabel("✅ Finalizar")
        .setStyle(ButtonStyle.Danger)
    );

    canal.send(`👩 Paciente: ${db[id].nome}\n🆔 RG: ${db[id].rg}`);
    canal.send({ content: "Escolha uma ação:", components: [row] });

    return interaction.reply({ content: "✅ Atendimento iniciado!", ephemeral: true });
  }

  // NOVA CONSULTA
  if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {

    const id = interaction.customId.split("_")[1];

    const modal = new ModalBuilder()
      .setCustomId(`consultaForm_${id}`)
      .setTitle("Consulta");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("peso").setLabel("Peso").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pressao").setLabel("Pressão").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("status").setLabel("Status (Normal/Risco/Urgente)").setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // SALVAR CONSULTA
  if (interaction.isModalSubmit() && interaction.customId.startsWith("consultaForm_")) {

    await interaction.deferReply({ ephemeral: true });

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    db[id].consultas += 1;

    const numero = db[id].consultas;

    const texto = `
📋 CONSULTA ${numero}/17

⚖️ Peso: ${interaction.fields.getTextInputValue("peso")}
💉 Pressão: ${interaction.fields.getTextInputValue("pressao")}
📊 Status: ${interaction.fields.getTextInputValue("status")}

👨‍⚕️ Médico: ${interaction.user}
`;

    saveDB(db);

    await interaction.channel.send(texto);

    return interaction.editReply({ content: "✅ Consulta registrada!" });
  }

  // FINALIZAR
  if (interaction.isButton() && interaction.customId.startsWith("finalizar_")) {

    await interaction.reply({ content: "🧹 Finalizando atendimento...", ephemeral: true });

    const log = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

    if (log) {
      const messages = await log.messages.fetch({ limit: 100 });
      await log.bulkDelete(messages);
    }

    setTimeout(() => {
      interaction.channel.delete();
    }, 3000);
  }

});

client.login(TOKEN);
