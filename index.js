const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;

// 📁 CONFIG
const CATEGORY_ID = "1492387782394515466"; // prontuário
const ACAO_CHANNEL_ID = "1477683906642706507"; // ações

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

// ===== READY =====
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
          .setLabel("🤰 Iniciar Pré-Natal")
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
      .setCustomId("form1")
      .setTitle("Check-in");

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
        new TextInputBuilder().setCustomId("bebes").setLabel("Qtd bebês").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("sexo").setLabel("Sexo bebê").setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // FORM
  if (interaction.isModalSubmit() && interaction.customId === "form1") {

    await interaction.deferReply({ ephemeral: true });

    const db = loadDB();
    const id = Date.now().toString();

    db[id] = {
      nome: interaction.fields.getTextInputValue("nome"),
      idade: interaction.fields.getTextInputValue("idade"),
      rg: interaction.fields.getTextInputValue("rg"),
      bebes: interaction.fields.getTextInputValue("bebes"),
      sexo: interaction.fields.getTextInputValue("sexo"),
      consultas: [],
      status: "Normal"
    };

    saveDB(db);

    // 📁 CANAL PRONTUÁRIO
    const canal = await interaction.guild.channels.create({
      name: `🩺-${db[id].nome}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID
    });

    await canal.send({ embeds: [gerarEmbed(db[id], interaction.user)] });

    // 🔘 BOTÕES (AÇÃO)
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`consulta_${id}`)
        .setLabel(`➕ ${db[id].nome}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`status_${id}`)
        .setLabel(`🚨 ${db[id].nome}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`finalizar_${id}`)
        .setLabel(`🗑️ ${db[id].nome}`)
        .setStyle(ButtonStyle.Danger)
    );

    const canalAcoes = interaction.guild.channels.cache.get(ACAO_CHANNEL_ID);

    if (canalAcoes) {
      await canalAcoes.send({
        content: `👩 Paciente: **${db[id].nome}**`,
        components: [row]
      });
    }

    return interaction.editReply({
      content: `✅ Atendimento criado para ${db[id].nome}`
    });
  }

  // CONSULTA
  if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    if (db[id].consultas.length >= 17) {
      return interaction.reply({ content: "❌ Limite atingido!", ephemeral: true });
    }

    db[id].consultas.push(new Date().toLocaleDateString());
    saveDB(db);

    const canal = interaction.guild.channels.cache.find(c => c.name.includes(db[id].nome));
    if (canal) canal.send({ embeds: [gerarEmbed(db[id], interaction.user)] });

    return interaction.reply({ content: "✅ Consulta registrada!", ephemeral: true });
  }

  // STATUS
  if (interaction.isButton() && interaction.customId.startsWith("status_")) {

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    db[id].status =
      db[id].status === "Normal" ? "Risco" :
      db[id].status === "Risco" ? "Urgente" : "Normal";

    saveDB(db);

    const canal = interaction.guild.channels.cache.find(c => c.name.includes(db[id].nome));
    if (canal) canal.send({ embeds: [gerarEmbed(db[id], interaction.user)] });

    return interaction.reply({ content: "🚨 Status atualizado!", ephemeral: true });
  }

  // FINALIZAR
  if (interaction.isButton() && interaction.customId.startsWith("finalizar_")) {

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    const canal = interaction.guild.channels.cache.find(c => c.name.includes(db[id].nome));

    await interaction.reply({ content: "🧹 Finalizando atendimento...", ephemeral: true });

    setTimeout(() => {
      if (canal) canal.delete();
    }, 3000);
  }

});

// ===== EMBED =====
function gerarEmbed(d, medico) {

  const cor =
    d.status === "Normal" ? 0x00ff88 :
    d.status === "Risco" ? 0xffa500 :
    0xff0000;

  let lista = "";
  for (let i = 1; i <= 17; i++) {
    lista += `${d.consultas[i-1] ? "✅" : "⬜"} ${i}º Pré-natal\n`;
  }

  return new EmbedBuilder()
    .setTitle("🤰 PRONTUÁRIO PRÉ-NATAL")
    .setColor(cor)
    .addFields(
      { name: "👩 Paciente", value: `${d.nome} | ${d.idade} anos` },
      { name: "🆔 RG", value: d.rg, inline: true },
      { name: "👶 Bebês", value: d.bebes, inline: true },
      { name: "🚻 Sexo", value: d.sexo, inline: true },
      { name: "🚨 Status", value: d.status },
      { name: "📋 Consultas", value: lista }
    )
    .setFooter({ text: `Médico: ${medico.tag}` })
    .setTimestamp();
}

client.login(TOKEN);
