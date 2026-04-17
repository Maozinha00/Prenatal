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

// 🔐 Railway ENV
const TOKEN = process.env.TOKEN;
const CATEGORY_ID = process.env.CATEGORY_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// ===== BANCO SEGURO =====
function loadDB() {
  try {
    if (!fs.existsSync("database.json")) return {};
    const data = fs.readFileSync("database.json");
    return data.length ? JSON.parse(data) : {};
  } catch (err) {
    console.log("Erro DB:", err);
    return {};
  }
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

  // COMANDO /painel
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("iniciar")
          .setLabel("🩺 Iniciar Pré-Natal")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: "🏥 Painel Pré-Natal",
        components: [row]
      });
    }
  }

  // BOTÃO
  if (interaction.isButton() && interaction.customId === "iniciar") {

    const modal = new ModalBuilder()
      .setCustomId("form1")
      .setTitle("Dados da Paciente");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("nome").setLabel("Nome").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("rg").setLabel("RG").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("nascimento").setLabel("Nascimento").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("acompanhante").setLabel("Acompanhante").setStyle(TextInputStyle.Short)
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
      nascimento: interaction.fields.getTextInputValue("nascimento"),
      acompanhante: interaction.fields.getTextInputValue("acompanhante")
    };

    saveDB(db);

    const modal = new ModalBuilder()
      .setCustomId(`form2_${id}`)
      .setTitle("Gestação");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("dum").setLabel("DUM").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("idade").setLabel("Idade Gestacional").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("peso").setLabel("Peso").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("altura").setLabel("Altura").setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // FORM 2
  if (interaction.isModalSubmit() && interaction.customId.startsWith("form2_")) {

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    db[id] = {
      ...db[id],
      dum: interaction.fields.getTextInputValue("dum"),
      idade: interaction.fields.getTextInputValue("idade"),
      peso: interaction.fields.getTextInputValue("peso"),
      altura: interaction.fields.getTextInputValue("altura")
    };

    saveDB(db);

    const modal = new ModalBuilder()
      .setCustomId(`form3_${id}`)
      .setTitle("Sintomas");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("dor").setLabel("Dor abdominal?").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("nausea").setLabel("Náusea?").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("sangramento").setLabel("Sangramento?").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("doenca").setLabel("Doença de risco?").setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // FINAL
  if (interaction.isModalSubmit() && interaction.customId.startsWith("form3_")) {

    await interaction.deferReply({ ephemeral: true });

    try {
      const id = interaction.customId.split("_")[1];
      const db = loadDB();

      db[id] = {
        ...db[id],
        dor: interaction.fields.getTextInputValue("dor"),
        nausea: interaction.fields.getTextInputValue("nausea"),
        sangramento: interaction.fields.getTextInputValue("sangramento"),
        doenca: interaction.fields.getTextInputValue("doenca")
      };

      saveDB(db);

      const final = db[id];

      const canal = await interaction.guild.channels.create({
        name: `prenatal-${final.nome}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      const relatorio = `
🤰 FICHA PRÉ-NATAL

👩 Nome: ${final.nome}
🆔 RG: ${final.rg}
🎂 Nascimento: ${final.nascimento}

👥 Acompanhante: ${final.acompanhante}

📅 DUM: ${final.dum}
📊 Idade: ${final.idade}
⚖️ Peso: ${final.peso}
📏 Altura: ${final.altura}

⚠️ Sintomas:
• Dor: ${final.dor}
• Náusea: ${final.nausea}
• Sangramento: ${final.sangramento}

🏥 Risco: ${final.doenca}

👨‍⚕️ Médico: ${interaction.user}
📅 Data: ${new Date().toLocaleDateString()}
`;

      await canal.send(relatorio);

      const log = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (log) await log.send(relatorio);

      return interaction.editReply({
        content: "✅ Ficha registrada com sucesso!"
      });

    } catch (err) {
      console.log(err);
      return interaction.editReply({
        content: "❌ Erro ao salvar ficha."
      });
    }
  }

});

client.login(TOKEN);
