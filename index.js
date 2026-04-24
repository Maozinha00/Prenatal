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

// ===== TEMP =====
const temp = {};

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

// ===== READY =====
client.once("clientReady", async () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("painel")
      .setDescription("Abrir painel hospitalar")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

  console.log("✅ /painel registrado");
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {
  try {

    // ===== PAINEL =====
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("teste")
            .setLabel("🧪 Teste de Gravidez")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("prenatal")
            .setLabel("🤰 Pré-natal")
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({
          content: "🏥 **Hospital Bella - Sistema**",
          components: [row]
        });
      }
    }

    // =========================
    // 🧪 TESTE DE GRAVIDEZ
    // =========================
    if (interaction.isButton() && interaction.customId === "teste") {

      const modal = new ModalBuilder()
        .setCustomId("teste_form")
        .setTitle("🧪 Teste de Gravidez");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Nome completo").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("menstruacao").setLabel("Última menstruação").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("atraso").setLabel("Atraso menstrual").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sintomas").setLabel("Sintomas").setStyle(TextInputStyle.Paragraph)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("exame").setLabel("Tipo de exame").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "teste_form") {

      await interaction.deferReply({ flags: 64 });

      const nome = interaction.fields.getTextInputValue("nome");

      const valor = Math.floor(Math.random() * 30000) + 1;
      const resultado = resultadoHCG(valor);

      const canal = await interaction.guild.channels.create({
        name: `🧪-${nome}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      await canal.send(`
# 🩺 QUESTIONÁRIO – TESTE DE GRAVIDEZ

👩 Nome: ${nome}
📅 Data: ${new Date().toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━

🧪 EXAME BETA HCG

Resultado: ${valor} mUI/mL  
Conclusão: ${resultado}

━━━━━━━━━━━━━━━━━━━━━━
`);

      return interaction.editReply("✅ Teste realizado com sucesso!");
    }

    // =========================
    // 🤰 PRÉ-NATAL
    // =========================
    if (interaction.isButton() && interaction.customId === "prenatal") {

      const modal = new ModalBuilder()
        .setCustomId("prenatal_form")
        .setTitle("🤰 Pré-natal");

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
          new TextInputBuilder().setCustomId("bebes").setLabel("Quantidade de bebês").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sexo").setLabel("Sexo do bebê").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "prenatal_form") {

      await interaction.deferReply({ flags: 64 });

      const nome = interaction.fields.getTextInputValue("nome");

      const canal = await interaction.guild.channels.create({
        name: `🤰-${nome}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      let lista = "";
      for (let i = 1; i <= 17; i++) lista += `${i}º Pré-natal\n`;

      await canal.send(`
# 🤰📋 CHECK-IN DE PRÉ-NATAL 📋🤰

👩 Nome: ${nome}

📅 Data: ${new Date().toLocaleDateString()}
⏰ Hora: ${new Date().toLocaleTimeString()}

━━━━━━━━━━━━━━━━━━━━━━

${lista}

━━━━━━━━━━━━━━━━━━━━━━

🏥 PARTO

📅 Dia:
⏰ Hora:
👨‍⚕️ Médico:
`);

      return interaction.editReply("✅ Pré-natal iniciado!");
    }

  } catch (err) {
    console.log("ERRO:", err);
  }
});

// ===== LOGIN =====
client.login(TOKEN);
