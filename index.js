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

const TOKEN = "SEU_TOKEN";
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

// ===== INTERAÇÃO =====
client.on("interactionCreate", async (interaction) => {

  // 🔘 COMANDO
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
            .setLabel("Nome da paciente")
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("rg")
            .setLabel("RG / Documento")
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("nascimento")
            .setLabel("Data de nascimento")
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("acompanhante")
            .setLabel("Nome do acompanhante")
            .setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }
  }

  // 🧾 FORM 1
  if (interaction.isModalSubmit() && interaction.customId === "form1") {

    const data = {
      nome: interaction.fields.getTextInputValue("nome"),
      rg: interaction.fields.getTextInputValue("rg"),
      nascimento: interaction.fields.getTextInputValue("nascimento"),
      acompanhante: interaction.fields.getTextInputValue("acompanhante")
    };

    const modal = new ModalBuilder()
      .setCustomId(`form2_${JSON.stringify(data)}`)
      .setTitle("Gestação");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("dum")
          .setLabel("Data última menstruação (DUM)")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("idade_gestacional")
          .setLabel("Idade gestacional")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("peso")
          .setLabel("Peso atual")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("altura")
          .setLabel("Altura")
          .setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // 🧾 FORM 2
  if (interaction.isModalSubmit() && interaction.customId.startsWith("form2_")) {

    const baseData = JSON.parse(interaction.customId.replace("form2_", ""));

    const data = {
      ...baseData,
      dum: interaction.fields.getTextInputValue("dum"),
      idade: interaction.fields.getTextInputValue("idade_gestacional"),
      peso: interaction.fields.getTextInputValue("peso"),
      altura: interaction.fields.getTextInputValue("altura")
    };

    const modal = new ModalBuilder()
      .setCustomId(`form3_${JSON.stringify(data)}`)
      .setTitle("Sintomas");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("dor")
          .setLabel("Dor abdominal?")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("nausea")
          .setLabel("Náusea / vômitos?")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("sangramento")
          .setLabel("Sangramento?")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("doenca")
          .setLabel("Doença de risco?")
          .setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // 🧾 FINAL
  if (interaction.isModalSubmit() && interaction.customId.startsWith("form3_")) {

    const data = JSON.parse(interaction.customId.replace("form3_", ""));

    const final = {
      ...data,
      dor: interaction.fields.getTextInputValue("dor"),
      nausea: interaction.fields.getTextInputValue("nausea"),
      sangramento: interaction.fields.getTextInputValue("sangramento"),
      doenca: interaction.fields.getTextInputValue("doenca")
    };

    const db = loadDB();

    let canal = await interaction.guild.channels.create({
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
📊 Idade Gestacional: ${final.idade}
⚖️ Peso: ${final.peso}
📏 Altura: ${final.altura}

⚠️ Sintomas:
• Dor: ${final.dor}
• Náusea: ${final.nausea}
• Sangramento: ${final.sangramento}

🏥 Doença de risco: ${final.doenca}

👨‍⚕️ Médico: ${interaction.user}
📅 Data: ${new Date().toLocaleDateString()}
`;

    canal.send(relatorio);

    const log = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (log) log.send(relatorio);

    return interaction.reply({
      content: "✅ Ficha completa registrada!",
      ephemeral: true
    });
  }

});

client.login(TOKEN);
