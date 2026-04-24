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

console.log("🚀 Iniciando bot...");

// ===== CONFIG =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const CATEGORY_ID = "1492387782394515466";
const ACAO_CHANNEL_ID = "1477683906642706507";

// ===== VALIDAÇÃO =====
if (!TOKEN || !CLIENT_ID) {
  console.log("⚠️ TOKEN ou CLIENT_ID não definido");
}

// ===== MEMÓRIA TEMP =====
const temp = {};

// ===== BANCO =====
function loadDB() {
  if (!fs.existsSync("database.json")) return {};
  return JSON.parse(fs.readFileSync("database.json"));
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

// ===== RESULTADO HCG =====
function resultadoHCG(valor) {
  if (valor < 5) return "NEGATIVO";
  if (valor <= 25) return "INCONCLUSIVO";
  return "POSITIVO";
}

// ===== ONLINE =====
client.once("clientReady", async () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);

  try {
    const commands = [
      new SlashCommandBuilder()
        .setName("painel")
        .setDescription("Abrir painel hospitalar")
    ].map(c => c.toJSON());

    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log("✅ /painel registrado");
  } catch (err) {
    console.log("❌ Erro slash:", err.message);
  }
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {
  try {

    // ===== /painel =====
    if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

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

    // ===== MODAL 1 =====
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

    // ===== RECEBE PARTE 1 =====
    if (interaction.isModalSubmit() && interaction.customId === "q1") {

      const userId = interaction.user.id;

      temp[userId] = {
        nome: interaction.fields.getTextInputValue("nome"),
        menstruacao: interaction.fields.getTextInputValue("menstruacao"),
        ciclo: interaction.fields.getTextInputValue("ciclo"),
        atraso: interaction.fields.getTextInputValue("atraso"),
        sintomas: interaction.fields.getTextInputValue("sintomas")
      };

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("abrir_q2")
          .setLabel("➡️ Continuar Questionário")
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({
        content: "✅ Parte 1 concluída!",
        components: [row],
        ephemeral: true
      });
    }

    // ===== BOTÃO ABRE PARTE 2 =====
    if (interaction.isButton() && interaction.customId === "abrir_q2") {

      const modal = new ModalBuilder()
        .setCustomId("q2")
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

    // ===== FINALIZA =====
    if (interaction.isModalSubmit() && interaction.customId === "q2") {

      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const dados = temp[userId];

      if (!dados) {
        return interaction.editReply("❌ Refazer formulário.");
      }

      const db = loadDB();
      const id = Date.now().toString();

      const valor = Math.floor(Math.random() * 30000) + 1;
      const resultado = resultadoHCG(valor);

      const canal = await interaction.guild.channels.create({
        name: `🩺-${dados.nome}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      db[id] = {
        ...dados,
        hcg: valor,
        resultado,
        consultas: [],
        channelId: canal.id
      };

      saveDB(db);
      delete temp[userId];

      await canal.send(`
# 🤰 CHECK-IN

👩 ${dados.nome}
📅 ${new Date().toLocaleDateString()}
⏰ ${new Date().toLocaleTimeString()}
`);

      await canal.send(`
🧪 EXAME BETA HCG

Resultado: ${valor} mUI/mL
Conclusão: ${resultado}
`);

      return interaction.editReply("✅ Atendimento finalizado!");
    }

  } catch (err) {
    console.log("ERRO:", err);
  }
});

// ===== LOGIN =====
client.login(TOKEN).catch(err => {
  console.log("❌ ERRO AO LOGAR:", err.message);
});
