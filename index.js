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

// ✅ CATEGORIA FIXA (PRONTUÁRIO)
const CATEGORY_ID = "1492387782394515466";

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
  console.log(`🔥 Hospital ON: ${client.user.tag}`);
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
        content: "🏥 SISTEMA PRÉ-NATAL",
        components: [row]
      });
    }
  }

  // INICIAR
  if (interaction.isButton() && interaction.customId === "iniciar") {

    const modal = new ModalBuilder()
      .setCustomId("form1")
      .setTitle("Check-in Pré-Natal");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("nome").setLabel("Nome da mamãe").setStyle(TextInputStyle.Short)
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
        new TextInputBuilder().setCustomId("sexo").setLabel("Sexo (Menino/Menina/Indefinido)").setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // FORM 1
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
      consultas: []
    };

    saveDB(db);

    // ✅ CRIA NA CATEGORIA CERTA
    const canal = await interaction.guild.channels.create({
      name: `prenatal-${db[id].nome}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`consulta_${id}`)
        .setLabel("➕ Consulta")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`parto_${id}`)
        .setLabel("👶 Parto")
        .setStyle(ButtonStyle.Success)
    );

    await canal.send(gerarFicha(db[id], interaction.user));

    await canal.send({
      content: "⚙️ Ações:",
      components: [row]
    });

    return interaction.editReply({ content: "✅ Pré-natal iniciado!" });
  }

  // CONSULTA
  if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    if (db[id].consultas.length >= 17) {
      return interaction.reply({ content: "❌ Já atingiu 17 consultas!", ephemeral: true });
    }

    db[id].consultas.push(new Date().toLocaleDateString());

    saveDB(db);

    await interaction.reply({ content: "✅ Consulta registrada!", ephemeral: true });

    await interaction.channel.send(gerarFicha(db[id], interaction.user));
  }

  // PARTO
  if (interaction.isButton() && interaction.customId.startsWith("parto_")) {

    const id = interaction.customId.split("_")[1];

    const modal = new ModalBuilder()
      .setCustomId(`partoForm_${id}`)
      .setTitle("Registrar Parto");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("data").setLabel("Dia do parto").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("hora").setLabel("Hora do parto").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("medicos").setLabel("Médicos responsáveis").setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  // SALVAR PARTO
  if (interaction.isModalSubmit() && interaction.customId.startsWith("partoForm_")) {

    await interaction.deferReply({ ephemeral: true });

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    db[id].parto = {
      data: interaction.fields.getTextInputValue("data"),
      hora: interaction.fields.getTextInputValue("hora"),
      medicos: interaction.fields.getTextInputValue("medicos")
    };

    saveDB(db);

    await interaction.channel.send(gerarFicha(db[id], interaction.user));

    return interaction.editReply({ content: "👶 Parto registrado!" });
  }

});

// ===== FICHA =====
function gerarFicha(d, medico) {

  let lista = "";
  for (let i = 1; i <= 17; i++) {
    lista += `${i}️⃣ ${i}º Pré-natal: ${d.consultas[i-1] || ""}\n`;
  }

  return `
# 🤰📋 CHECK-IN DE PRÉ-NATAL 📋🤰

👩 Nome: ${d.nome}
🎂 Idade: ${d.idade}
🆔 RG: ${d.rg}

👶 Bebês: ${d.bebes}
🚻 Sexo: ${d.sexo}

📅 Data: ${new Date().toLocaleDateString()}
👨‍⚕️ Médico: ${medico}

💕

${lista}

🏥 PARTO:
📅 ${d.parto?.data || ""}
⏰ ${d.parto?.hora || ""}
👨‍⚕️ ${d.parto?.medicos || ""}
`;
}

client.login(TOKEN);
