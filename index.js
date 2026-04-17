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

  // /painel
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

  // INICIAR
  if (interaction.isButton() && interaction.customId === "iniciar") {

    const modal = new ModalBuilder()
      .setCustomId("inicio")
      .setTitle("Dados da Paciente");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("nome").setLabel("Nome").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("rg").setLabel("Documento").setStyle(TextInputStyle.Short)
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
      rg: interaction.fields.getTextInputValue("rg"),
      consultas: []
    };

    saveDB(db);

    const canal = await interaction.guild.channels.create({
      name: `🩺-${db[id].nome}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`consulta_${id}`)
        .setLabel(`➕ ${db[id].nome}`)
        .setStyle(ButtonStyle.Primary)
    );

    const canalAcoes = interaction.guild.channels.cache.get(ACAO_CHANNEL_ID);

    if (canalAcoes) {
      await canalAcoes.send({
        content: `👩 Paciente: **${db[id].nome}**`,
        components: [row]
      });
    }

    await canal.send(`📋 Prontuário criado para ${db[id].nome}`);

    return interaction.editReply({ content: "✅ Paciente registrada!" });
  }

  // ===== CONSULTA ETAPA 1 =====
  if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {

    const id = interaction.customId.split("_")[1];

    const modal = new ModalBuilder()
      .setCustomId(`consulta1_${id}`)
      .setTitle("📋 Dados e Gestação");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("nascimento").setLabel("Data nascimento").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("dum").setLabel("DUM").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("idade_gestacional").setLabel("Idade gestacional").setStyle(TextInputStyle.Short)
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

  // ===== SALVAR ETAPA 1 =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith("consulta1_")) {

    await interaction.deferReply({ ephemeral: true });

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    db[id].temp = {
      nascimento: interaction.fields.getTextInputValue("nascimento"),
      dum: interaction.fields.getTextInputValue("dum"),
      idade_gestacional: interaction.fields.getTextInputValue("idade_gestacional"),
      peso: interaction.fields.getTextInputValue("peso"),
      altura: interaction.fields.getTextInputValue("altura")
    };

    saveDB(db);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`continuar_${id}`)
        .setLabel("➡️ Continuar")
        .setStyle(ButtonStyle.Success)
    );

    return interaction.editReply({
      content: "✅ Primeira parte salva",
      components: [row]
    });
  }

  // ===== ABRIR ETAPA 2 =====
  if (interaction.isButton() && interaction.customId.startsWith("continuar_")) {

    const id = interaction.customId.split("_")[1];

    const modal = new ModalBuilder()
      .setCustomId(`consulta2_${id}`)
      .setTitle("🧪 Exames e Sintomas");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("gravida").setLabel("Grávida (Sim/Não)").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("primeira").setLabel("Primeira gestação").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("gestacoes").setLabel("Gestações anteriores").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("partos").setLabel("Partos anteriores").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("sintomas").setLabel("Sintomas").setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }

  // ===== FINAL CONSULTA =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith("consulta2_")) {

    await interaction.deferReply({ ephemeral: true });

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    const base = db[id].temp;

    const final = {
      ...base,
      gravida: interaction.fields.getTextInputValue("gravida"),
      primeira: interaction.fields.getTextInputValue("primeira"),
      gestacoes: interaction.fields.getTextInputValue("gestacoes"),
      partos: interaction.fields.getTextInputValue("partos"),
      sintomas: interaction.fields.getTextInputValue("sintomas")
    };

    delete db[id].temp;

    db[id].consultas.push(final);
    saveDB(db);

    const canal = interaction.guild.channels.cache.find(c => c.name.includes(db[id].nome));

    if (canal) {
      canal.send(`
# 🤰📋 CHECK-IN DE PRÉ-NATAL 📋🤰

👩 Nome: ${db[id].nome}
🆔 RG: ${db[id].rg}

📅 ${new Date().toLocaleDateString()}
👨‍⚕️ ${interaction.user}

---

🤰 Grávida: ${final.gravida}
📅 DUM: ${final.dum}
📊 Idade gestacional: ${final.idade_gestacional}
⚖️ Peso: ${final.peso}
📏 Altura: ${final.altura}

👶 Primeira gestação: ${final.primeira}
📊 Gestações: ${final.gestacoes}
🏥 Partos: ${final.partos}

⚠️ Sintomas:
${final.sintomas}
`);
    }

    // REMOVE BOTÃO DO CANAL DE AÇÕES
    const canalAcoes = interaction.guild.channels.cache.get(ACAO_CHANNEL_ID);
    if (canalAcoes) {
      const msgs = await canalAcoes.messages.fetch({ limit: 50 });
      const msg = msgs.find(m => m.content.includes(db[id].nome));
      if (msg) await msg.delete();
    }

    return interaction.editReply({
      content: "✅ Consulta finalizada!"
    });
  }

});

client.login(TOKEN);
