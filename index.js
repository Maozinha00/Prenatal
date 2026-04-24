import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes
} from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("❌ Configure TOKEN / CLIENT_ID / GUILD_ID");
  process.exit(1);
}

// 🧠 BANCO (memória)
const prontuarios = new Map();

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel Hospital Bella")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados");
  } catch (err) {
    console.error(err);
  }
})();

// ================= READY =================
client.once("clientReady", () => {
  console.log(`🤖 Online como ${client.user.tag}`);
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async (interaction) => {
  try {

    // ===== COMANDO =====
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {

        const embed = new EmbedBuilder()
          .setTitle("🏥 HOSPITAL BELLA")
          .setDescription("Selecione uma opção:")
          .setColor("Orange");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("gravidez")
            .setLabel("🩺 Teste de Gravidez")
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId("prenatal")
            .setLabel("🤰 Pré-Natal")
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
      }
    }

    // ===== BOTÕES =====
    if (interaction.isButton()) {

      // 🔹 GRAVIDEZ
      if (interaction.customId === "gravidez") {

        const modal = new ModalBuilder()
          .setCustomId("gravidez_1")
          .setTitle("🩺 Gravidez (1/2)");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("nome")
              .setLabel("Nome completo")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("atraso")
              .setLabel("Dias de atraso")
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("sintomas")
              .setLabel("Sintomas")
              .setStyle(TextInputStyle.Short)
          )
        );

        return interaction.showModal(modal);
      }

      // 🔹 PRÉ NATAL
      if (interaction.customId === "prenatal") {

        const modal = new ModalBuilder()
          .setCustomId("prenatal_form")
          .setTitle("🤰 Pré-Natal");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("nome")
              .setLabel("Nome da paciente")
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("idade")
              .setLabel("Idade")
              .setStyle(TextInputStyle.Short)
          )
        );

        return interaction.showModal(modal);
      }

      // 🔹 CONSULTA
      if (interaction.customId.startsWith("consulta_")) {

        const num = interaction.customId.split("_")[1];

        const modal = new ModalBuilder()
          .setCustomId(`consulta_${num}`)
          .setTitle(`Consulta ${num}`);

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("info")
              .setLabel("Informações")
              .setStyle(TextInputStyle.Paragraph)
          )
        );

        return interaction.showModal(modal);
      }
    }

    // ===== MODAIS =====
    if (interaction.isModalSubmit()) {

      // 🔹 GRAVIDEZ 1
      if (interaction.customId === "gravidez_1") {

        const nome = interaction.fields.getTextInputValue("nome");

        prontuarios.set(interaction.user.id, {
          nome,
          consultas: []
        });

        const resultado = Math.random() > 0.5 ? "POSITIVO" : "NEGATIVO";

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🧪 Resultado")
              .setDescription(`Paciente: **${nome}**\nResultado: **${resultado}**`)
              .setColor(resultado === "POSITIVO" ? "Green" : "Red")
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("prenatal")
                .setLabel("➡️ Iniciar Pré-Natal")
                .setStyle(ButtonStyle.Success)
            )
          ]
        });
      }

      // 🔹 PRÉ NATAL
      if (interaction.customId === "prenatal_form") {

        const nome = interaction.fields.getTextInputValue("nome");

        prontuarios.set(interaction.user.id, {
          nome,
          consultas: []
        });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🤰 PRONTUÁRIO")
              .setDescription(`Paciente: **${nome}**`)
              .setColor("Orange")
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId("consulta_1").setLabel("1º").setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId("consulta_2").setLabel("2º").setStyle(ButtonStyle.Primary),
              new ButtonBuilder().setCustomId("consulta_3").setLabel("3º").setStyle(ButtonStyle.Primary)
            )
          ]
        });
      }

      // 🔹 CONSULTA
      if (interaction.customId.startsWith("consulta_")) {

        const prontuario = prontuarios.get(interaction.user.id);

        if (!prontuario) {
          return interaction.reply({
            content: "❌ Sem prontuário.",
            flags: 64
          });
        }

        const info = interaction.fields.getTextInputValue("info");

        prontuario.consultas.push(info);

        return interaction.reply({
          content: "✅ Consulta registrada!",
          flags: 64
        });
      }
    }

  } catch (err) {
    console.error("❌ ERRO:", err);

    if (interaction.isRepliable() && !interaction.replied) {
      interaction.reply({
        content: "❌ Erro interno.",
        flags: 64
      });
    }
  }
});

client.login(TOKEN);
