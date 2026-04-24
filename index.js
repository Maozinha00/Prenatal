require("dotenv").config();

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

// ===== RESULTADO HCG =====
function resultadoHCG(valor) {
  if (valor < 5) return "NEGATIVO";
  if (valor <= 25) return "INCONCLUSIVO";
  return "POSITIVO";
}

// ===== SLASH =====
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel hospitalar")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ /painel registrado");
  } catch (err) {
    console.log(err);
  }
})();

// ===== ONLINE =====
client.once("ready", () => {
  console.log(`🏥 ONLINE: ${client.user.tag}`);
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {
  try {

    // PAINEL
    if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("iniciar")
          .setLabel("🤰 Iniciar Atendimento")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: "🏥 Sistema Hospital Bella",
        components: [row]
      });
    }

    // INICIAR
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
        )
      );

      return interaction.showModal(modal);
    }

    // SALVAR
    if (interaction.isModalSubmit() && interaction.customId === "inicio") {
      await interaction.deferReply({ ephemeral: true });

      const db = loadDB();
      const id = Date.now().toString();

      const canal = await interaction.guild.channels.create({
        name: `🩺-${interaction.fields.getTextInputValue("nome")}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      db[id] = {
        nome: interaction.fields.getTextInputValue("nome"),
        idade: interaction.fields.getTextInputValue("idade"),
        rg: interaction.fields.getTextInputValue("rg"),
        consultas: [],
        channelId: canal.id
      };

      saveDB(db);

      // CHECK-IN
      let lista = "";
      for (let i = 1; i <= 17; i++) {
        lista += `${i}º Pré-natal\n`;
      }

      const checkin = `
# 🤰📋 CHECK-IN DE PRÉ-NATAL 📋🤰

👩 Nome: ${db[id].nome}
🎂 Idade: ${db[id].idade}
🆔 RG: ${db[id].rg}

📅 Data: ${new Date().toLocaleDateString()}
⏰ Hora: ${new Date().toLocaleTimeString()}

────────────────────────────

${lista}
`;

      await canal.send(checkin);

      // BOTÕES
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`consulta_${id}`)
          .setLabel("➕ Consulta")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`exame_${id}`)
          .setLabel("🧪 Exame")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`parto_${id}`)
          .setLabel("🏥 Parto")
          .setStyle(ButtonStyle.Danger)
      );

      const canalAcoes = interaction.guild.channels.cache.get(ACAO_CHANNEL_ID);
      if (canalAcoes) {
        await canalAcoes.send({
          content: `👩 Paciente: ${db[id].nome}`,
          components: [row]
        });
      }

      return interaction.editReply("✅ Paciente registrada!");
    }

    // CONSULTA
    if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {
      const id = interaction.customId.split("_")[1];
      const db = loadDB();

      db[id].consultas.push(new Date().toLocaleDateString());
      saveDB(db);

      return interaction.reply({
        content: `✅ Consulta (${db[id].consultas.length}/17)`,
        ephemeral: true
      });
    }

    // EXAME
    if (interaction.isButton() && interaction.customId.startsWith("exame_")) {
      const id = interaction.customId.split("_")[1];

      const modal = new ModalBuilder()
        .setCustomId(`exame_${id}`)
        .setTitle("Beta HCG");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("valor")
            .setLabel("Valor mUI/mL")
            .setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("exame_")) {
      await interaction.deferReply({ ephemeral: true });

      const id = interaction.customId.split("_")[1];
      const db = loadDB();

      const valor = Number(interaction.fields.getTextInputValue("valor"));
      const resultado = resultadoHCG(valor);

      const canal = interaction.guild.channels.cache.get(db[id].channelId);

      await canal.send(`
# 🧪 EXAME

Resultado: ${valor} mUI/mL  
Conclusão: ${resultado}
`);

      return interaction.editReply("✅ Exame registrado!");
    }

    // PARTO
    if (interaction.isButton() && interaction.customId.startsWith("parto_")) {
      await interaction.deferReply({ ephemeral: true });

      const id = interaction.customId.split("_")[1];
      const db = loadDB();
      const p = db[id];

      const canal = interaction.guild.channels.cache.get(p.channelId);

      await canal.send(`
# 🏥 PARTO FINALIZADO

👩 ${p.nome}
📅 ${new Date().toLocaleDateString()}
⏰ ${new Date().toLocaleTimeString()}
👨‍⚕️ ${interaction.user}
`);

      return interaction.editReply("🏥 Parto concluído!");
    }

  } catch (err) {
    console.log(err);
  }
});

client.login(TOKEN);
