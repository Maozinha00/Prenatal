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
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");

// ===== CONFIG =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const CATEGORY_ID = "1492387782394515466";
const ACAO_CHANNEL_ID = "1477683906642706507";

if (!TOKEN || !CLIENT_ID) {
  console.log("❌ Configure TOKEN e CLIENT_ID");
  process.exit(1);
}

// ===== BANCO =====
function loadDB() {
  if (!fs.existsSync("database.json")) return {};
  return JSON.parse(fs.readFileSync("database.json"));
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

// ===== HCG =====
function resultadoHCG(valor) {
  if (valor < 5) return "NEGATIVO";
  if (valor <= 25) return "INCONCLUSIVO";
  return "POSITIVO";
}

// ===== SLASH =====
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir sistema hospitalar")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ /painel registrado");
})();

// ===== ONLINE =====
client.once("ready", () => {
  console.log(`🏥 ONLINE: ${client.user.tag}`);
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {
  try {

    // ===== PAINEL =====
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("start")
            .setLabel("🤰 Iniciar Atendimento")
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({
          content: "🏥 Hospital Bella",
          components: [row]
        });
      }
    }

    // ===== QUESTIONÁRIO 1 =====
    if (interaction.isButton() && interaction.customId === "start") {

      const modal = new ModalBuilder()
        .setCustomId("q1")
        .setTitle("🩺 Questionário (1/2)");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Nome completo").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("menstruacao").setLabel("Última menstruação").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("ciclo").setLabel("Ciclo regular?").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("atraso").setLabel("Atraso menstrual").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sintomas").setLabel("Sintomas").setStyle(TextInputStyle.Paragraph)
        )
      );

      return interaction.showModal(modal);
    }

    // ===== QUESTIONÁRIO 2 =====
    if (interaction.isModalSubmit() && interaction.customId === "q1") {

      const dados = {
        nome: interaction.fields.getTextInputValue("nome"),
        menstruacao: interaction.fields.getTextInputValue("menstruacao"),
        ciclo: interaction.fields.getTextInputValue("ciclo"),
        atraso: interaction.fields.getTextInputValue("atraso"),
        sintomas: interaction.fields.getTextInputValue("sintomas")
      };

      const modal = new ModalBuilder()
        .setCustomId("q2_" + JSON.stringify(dados))
        .setTitle("🩺 Questionário (2/2)");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("teste").setLabel("Fez teste?").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("medicamento").setLabel("Anticoncepcional?").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("gravidez").setLabel("Já esteve grávida?").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("dor").setLabel("Dor ou sangramento?").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("exame").setLabel("Tipo de exame").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // ===== FINAL =====
    if (interaction.isModalSubmit() && interaction.customId.startsWith("q2_")) {

      await interaction.deferReply({ ephemeral: true });

      const dados1 = JSON.parse(interaction.customId.replace("q2_", ""));
      const db = loadDB();
      const id = Date.now().toString();

      const valor = Math.floor(Math.random() * 30000) + 1;
      const resultado = resultadoHCG(valor);

      const canal = await interaction.guild.channels.create({
        name: `🩺-${dados1.nome}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      db[id] = {
        ...dados1,
        teste: interaction.fields.getTextInputValue("teste"),
        medicamento: interaction.fields.getTextInputValue("medicamento"),
        gravidez: interaction.fields.getTextInputValue("gravidez"),
        dor: interaction.fields.getTextInputValue("dor"),
        exame: interaction.fields.getTextInputValue("exame"),
        hcg: valor,
        resultado,
        consultas: [],
        channelId: canal.id
      };

      saveDB(db);

      // ===== CHECK-IN =====
      let lista = "";
      for (let i = 1; i <= 17; i++) lista += `${i}º Pré-natal\n`;

      await canal.send(`
# 🤰📋 CHECK-IN DE PRÉ-NATAL

👩 ${dados1.nome}
📅 ${new Date().toLocaleDateString()}
⏰ ${new Date().toLocaleTimeString()}

${lista}
`);

      // ===== LAUDO =====
      await canal.send(`
🏥 **CENTRO MÉDICO BELLA**
Diagnóstico Laboratorial | Saúde da Mulher

━━━━━━━━━━━━━━━━━━━━━━

📋 **DADOS DA PACIENTE**
Nome: ${dados1.nome}
Data: ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━

🧪 **EXAME LABORATORIAL**
**BETA - HCG QUANTITATIVO**

Material: Soro  
Resultado: ${valor.toLocaleString()} mUI/mL  

✔️ **Conclusão: ${resultado}**

━━━━━━━━━━━━━━━━━━━━━━

📊 **VALORES DE REFERÊNCIA**
Positivo: > 25  
Intermediário: 5 a 25  
Negativo: < 5  

━━━━━━━━━━━━━━━━━━━━━━

⚠️ **OBSERVAÇÕES**
Pode indicar gestação.

━━━━━━━━━━━━━━━━━━━━━━
`);

      // ===== BOTÕES =====
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`consulta_${id}`).setLabel("Consulta").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`exame_${id}`).setLabel("Novo Exame").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`parto_${id}`).setLabel("Parto").setStyle(ButtonStyle.Danger)
      );

      const canalAcoes = interaction.guild.channels.cache.get(ACAO_CHANNEL_ID);

      if (canalAcoes) {
        await canalAcoes.send({
          content: `👩 Paciente: ${dados1.nome}`,
          components: [row]
        });
      }

      return interaction.editReply("✅ Atendimento finalizado!");
    }

    // ===== CONSULTA =====
    if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {
      const id = interaction.customId.split("_")[1];
      const db = loadDB();

      db[id].consultas.push(Date.now());
      saveDB(db);

      return interaction.reply({
        content: `Consulta ${db[id].consultas.length}/17`,
        ephemeral: true
      });
    }

    // ===== PARTO =====
    if (interaction.isButton() && interaction.customId.startsWith("parto_")) {
      await interaction.reply({ content: "🏥 Parto realizado!", ephemeral: true });
    }

  } catch (err) {
    console.log("ERRO:", err);
  }
});

client.login(TOKEN);
