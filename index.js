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

// ===== TEMP =====
const temp = {};

// ===== DB =====
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
client.once("ready", async () => {
  console.log(`✅ ONLINE: ${client.user.tag}`);

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
            .setCustomId("start")
            .setLabel("🤰 Iniciar Atendimento")
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({
          content: "🏥 **Hospital Bella**",
          components: [row]
        });
      }
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
          new TextInputBuilder().setCustomId("atraso").setLabel("Dias de atraso").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sintomas").setLabel("Sintomas").setStyle(TextInputStyle.Paragraph)
        )
      );

      return await interaction.showModal(modal);
    }

    // ===== MODAL 1 → SALVA =====
    if (interaction.isModalSubmit() && interaction.customId === "q1") {

      temp[interaction.user.id] = {
        nome: interaction.fields.getTextInputValue("nome"),
        menstruacao: interaction.fields.getTextInputValue("menstruacao"),
        ciclo: interaction.fields.getTextInputValue("ciclo"),
        atraso: interaction.fields.getTextInputValue("atraso"),
        sintomas: interaction.fields.getTextInputValue("sintomas")
      };

      // ⚠️ IMPORTANTE → responder antes de abrir outro modal
      await interaction.reply({
        content: "➡️ Continuando atendimento...",
        ephemeral: true
      });

      const modal = new ModalBuilder()
        .setCustomId("q2")
        .setTitle("🩺 Questionário (2/2)");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("teste").setLabel("Fez teste?").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("medicamento").setLabel("Usa anticoncepcional?").setStyle(TextInputStyle.Short)
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

      return interaction.followUp({
        content: "📋 Preencha a segunda parte:",
        ephemeral: true
      }).then(() => interaction.showModal(modal));
    }

    // ===== FINAL =====
    if (interaction.isModalSubmit() && interaction.customId === "q2") {

      await interaction.deferReply({ ephemeral: true });

      const dados = temp[interaction.user.id];
      if (!dados) return interaction.editReply("❌ Refaça o formulário");

      const valor = Math.floor(Math.random() * 30000) + 1;
      const resultado = resultadoHCG(valor);

      const canal = await interaction.guild.channels.create({
        name: `🩺-${dados.nome}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      // ===== CHECK-IN COMPLETO =====
      await canal.send(`
# 🤰📋 CHECK-IN DE PRÉ-NATAL

👩 Nome: ${dados.nome}
📅 Data: ${new Date().toLocaleDateString()}
⏰ Hora: ${new Date().toLocaleTimeString()}

━━━━━━━━━━━━━━━━━━

1️⃣ 1º Pré-natal
2️⃣ 2º Pré-natal
3️⃣ 3º Pré-natal
4️⃣ 4º Pré-natal
5️⃣ 5º Pré-natal
6️⃣ 6º Pré-natal
7️⃣ 7º Pré-natal
8️⃣ 8º Pré-natal
9️⃣ 9º Pré-natal
🔟 10º Pré-natal
1️⃣1️⃣ 11º Pré-natal
1️⃣2️⃣ 12º Pré-natal
1️⃣3️⃣ 13º Pré-natal
1️⃣4️⃣ 14º Pré-natal
1️⃣5️⃣ 15º Pré-natal
1️⃣6️⃣ 16º Pré-natal
1️⃣7️⃣ 17º Pré-natal
`);

      // ===== LAUDO =====
      await canal.send(`
🏥 **CENTRO MÉDICO BELLA**

🧪 BETA HCG

Resultado: ${valor.toLocaleString()} mUI/mL
Conclusão: **${resultado}**

━━━━━━━━━━━━━━━━━━

📊 Referência:
> Positivo: >25  
> Intermediário: 5-25  
> Negativo: <5  
`);

      delete temp[interaction.user.id];

      return interaction.editReply("✅ Atendimento finalizado!");
    }

  } catch (err) {
    console.log("ERRO:", err);
  }
});

// ===== LOGIN =====
client.login(TOKEN);
