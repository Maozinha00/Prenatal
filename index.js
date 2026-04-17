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

client.on("interactionCreate", async (interaction) => {

  // PAINEL
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel") {
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

    await interaction.deferReply({ ephemeral: true });

    const db = loadDB();
    const id = Date.now().toString();

    db[id] = {
      nome: interaction.fields.getTextInputValue("nome"),
      idade: interaction.fields.getTextInputValue("idade"),
      rg: interaction.fields.getTextInputValue("rg"),
      bebes: interaction.fields.getTextInputValue("bebes"),
      sexo: interaction.fields.getTextInputValue("sexo"),
      consultas: []
    };

    saveDB(db);

    await interaction.guild.channels.create({
      name: `🩺-${db[id].nome}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID
    });

    const canalAcoes = interaction.guild.channels.cache.get(ACAO_CHANNEL_ID);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`consulta_${id}`)
        .setLabel(`➕ ${db[id].nome}`)
        .setStyle(ButtonStyle.Primary)
    );

    if (canalAcoes) {
      canalAcoes.send({
        content: `👩 Paciente: **${db[id].nome}**`,
        components: [row]
      });
    }

    return interaction.editReply({ content: "✅ Paciente registrada!" });
  }

  // CONSULTA
  if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {

    const id = interaction.customId.split("_")[1];

    const modal = new ModalBuilder()
      .setCustomId(`consulta_${id}`)
      .setTitle("Consulta Pré-Natal");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("sintomas").setLabel("Sintomas").setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }

  // FINAL CONSULTA
  if (interaction.isModalSubmit() && interaction.customId.startsWith("consulta_")) {

    await interaction.deferReply({ ephemeral: true });

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    db[id].consultas.push(new Date().toLocaleDateString());
    const total = db[id].consultas.length;

    saveDB(db);

    let lista = "";
    for (let i = 1; i <= 17; i++) {
      lista += `${db[id].consultas[i-1] ? "✅" : "⬜"} ${i}º Pré-natal\n`;
    }

    const ficha = `
# 🤰📋 CHECK-IN DE PRÉ-NATAL 📋🤰

👩 Nome: ${db[id].nome}
🎂 Idade: ${db[id].idade}
🆔 RG: ${db[id].rg}

📅 ${new Date().toLocaleDateString()}
👨‍⚕️ ${interaction.user}

---

## 💕 CONSULTAS

${lista}

---

## ⚠️ SINTOMAS
${interaction.fields.getTextInputValue("sintomas")}
`;

    const canal = interaction.guild.channels.cache.find(c => c.name.includes(db[id].nome));
    if (canal) canal.send(ficha);

    // LIBERA PARTO
    if (total >= 17) {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`parto_${id}`)
          .setLabel("🏥 Registrar Parto")
          .setStyle(ButtonStyle.Danger)
      );

      canal.send({
        content: "⚠️ Todas consultas concluídas!",
        components: [row]
      });
    }

    return interaction.editReply({
      content: `✅ Consulta ${total}/17 registrada`
    });
  }

  // BOTÃO PARTO
  if (interaction.isButton() && interaction.customId.startsWith("parto_")) {

    const id = interaction.customId.split("_")[1];

    const modal = new ModalBuilder()
      .setCustomId(`parto_${id}`)
      .setTitle("Dados do Parto");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("dia").setLabel("Dia do parto").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("hora").setLabel("Horário").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("medicos").setLabel("Médicos (@)").setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // FINAL PARTO
  if (interaction.isModalSubmit() && interaction.customId.startsWith("parto_")) {

    await interaction.deferReply({ ephemeral: true });

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    const canal = interaction.guild.channels.cache.find(c => c.name.includes(db[id].nome));

    if (canal) {
      canal.send(`
# 🏥✨ DADOS DO PARTO

📅 Dia do parto: ${interaction.fields.getTextInputValue("dia")}
⏰ Horário: ${interaction.fields.getTextInputValue("hora")}
👨‍⚕️ Médicos: ${interaction.fields.getTextInputValue("medicos")}
`);
    }

    return interaction.editReply({
      content: "👶 Parto registrado com sucesso!"
    });
  }

});

client.login(TOKEN);
