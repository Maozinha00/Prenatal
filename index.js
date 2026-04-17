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

// ================= DATABASE =================
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

// ================= READY =================
client.once("ready", () => {
  console.log(`🏥 Hospital ONLINE: ${client.user.tag}`);
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async (interaction) => {

  // ===== PAINEL =====
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

  // ===== INICIAR PACIENTE =====
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

  // ===== SALVAR PACIENTE =====
  if (interaction.isModalSubmit() && interaction.customId === "inicio") {

    await interaction.deferReply({ ephemeral: true });

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
        .setLabel("➕ Consulta")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`parto_${id}`)
        .setLabel("🏥 Parto / Relatório")
        .setStyle(ButtonStyle.Danger)
    );

    if (canalAcoes) {
      canalAcoes.send({
        content: `👩 Paciente: **${db[id].nome}**`,
        components: [row]
      });
    }

    return interaction.editReply({ content: "✅ Paciente registrada!" });
  }

  // ===== CONSULTA MODAL =====
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

  // ================= CONSULTA + PRONTUÁRIO EVOLUTIVO =================
  if (interaction.isModalSubmit() && interaction.customId.startsWith("consulta_")) {

    await interaction.deferReply({ ephemeral: true });

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    db[id].consultas.push({
      data: new Date().toLocaleDateString(),
      sintomas: interaction.fields.getTextInputValue("sintomas")
    });

    const total = db[id].consultas.length;

    saveDB(db);

    // ===== CHECKLIST 17 =====
    let lista = "";
    for (let i = 1; i <= 17; i++) {
      lista += `${db[id].consultas[i - 1] ? "✅" : "⬜"} ${i}º Pré-natal\n`;
    }

    // ===== HISTÓRICO SINTOMAS =====
    let sintomasHistorico = "";
    db[id].consultas.forEach((c, index) => {
      sintomasHistorico += `\n${index + 1}º Consulta: ${c.sintomas}`;
    });

    // ===== EXAME EVOLUTIVO =====
    const exame = `
# 🤰📋 CHECK-IN DE PRÉ-NATAL 📋🤰


## 👩 DADOS DA PACIENTE

👩 Nome: ${db[id].nome}  
🎂 Idade: ${db[id].idade}  
🆔 RG: ${db[id].rg}  

👶 Bebês: ${db[id].bebes}  
🚻 Sexo: ${db[id].sexo}  

📅 Data: ${new Date().toLocaleDateString()}  
⏰ Hora: ${new Date().toLocaleTimeString()}  
👨‍⚕️ Médico: ${interaction.user}


## 💕 EVOLUÇÃO DAS CONSULTAS

${lista}


## 🩺 HISTÓRICO DE SINTOMAS

${sintomasHistorico}


## 🏥 PARTO

📅 Data do parto:  
⏰ Hora do parto:  
👨‍⚕️ Médicos responsáveis:  
`;

    const canal = interaction.guild.channels.cache.get(db[id].channelId);

    if (canal) {
      await canal.send(exame);
    }

    return interaction.editReply({
      content: `✅ Consulta ${total}/17 registrada e prontuário atualizado!`
    });
  }

  // ================= PARTO / RELATÓRIO FINAL =================
  if (interaction.isButton() && interaction.customId.startsWith("parto_")) {

    const id = interaction.customId.split("_")[1];
    const db = loadDB();

    const paciente = db[id];

    if (!paciente) {
      return interaction.reply({ content: "❌ Paciente não encontrada!", ephemeral: true });
    }

    let lista = "";
    for (let i = 1; i <= 17; i++) {
      lista += `${paciente.consultas[i - 1] ? "✅" : "⬜"} ${i}º Pré-natal\n`;
    }

    const relatorio = `
# 🏥🤱 RELATÓRIO DE PARTO FINAL

👩 Paciente: ${paciente.nome}
🎂 Idade: ${paciente.idade}
🆔 RG: ${paciente.rg}
👶 Bebês: ${paciente.bebes}
🚻 Sexo: ${paciente.sexo}

📅 Data: ${new Date().toLocaleDateString()}
👨‍⚕️ Responsável: ${interaction.user}

---

## 📊 PRÉ-NATAL

${lista}

---

## 🏥 STATUS
✔️ Atendimento finalizado
`;

    const canal = interaction.guild.channels.cache.get(paciente.channelId);

    if (canal) {
      await canal.send(relatorio);
    }

    return interaction.reply({
      content: "🏥 Relatório de parto gerado com sucesso!",
      ephemeral: true
    });
  }

});

client.login(TOKEN);
