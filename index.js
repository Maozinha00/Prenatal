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

// 🧠 BANCO
const prontuarios = new Map();

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel Hospital Bella")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
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
          .setDescription("Selecione uma opção abaixo:")
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
          .setCustomId("form_gravidez")
          .setTitle("🩺 Questionário Gravidez");

        const perguntas = [
          "Nome completo",
          "Última menstruação",
          "Ciclo regular?",
          "Dias de atraso",
          "Sintomas"
        ];

        const inputs = perguntas.map((p, i) =>
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(`p${i}`)
              .setLabel(p)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        modal.addComponents(...inputs);

        return interaction.showModal(modal);
      }

      // 🔹 PRÉ NATAL
      if (interaction.customId === "prenatal") {

        const modal = new ModalBuilder()
          .setCustomId("form_prenatal")
          .setTitle("🤰 Check-in Pré-Natal");

        const fields = [
          "Nome",
          "Idade",
          "RG",
          "Qtd Bebês",
          "Médico"
        ];

        const inputs = fields.map((f, i) =>
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(`pre${i}`)
              .setLabel(f)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        modal.addComponents(...inputs);

        return interaction.showModal(modal);
      }

      // 🔹 CONSULTAS
      if (interaction.customId.startsWith("consulta_")) {

        const numero = interaction.customId.split("_")[1];

        const modal = new ModalBuilder()
          .setCustomId(`registro_${numero}`)
          .setTitle(`📝 Consulta ${numero}`);

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("info")
              .setLabel("Informações da consulta")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }
    }

    // ===== MODAIS =====
    if (interaction.isModalSubmit()) {

      // 🔹 TESTE GRAVIDEZ
      if (interaction.customId === "form_gravidez") {

        const nome = interaction.fields.getTextInputValue("p0");

        const resultado = Math.random() > 0.5 ? "POSITIVO" : "NEGATIVO";

        prontuarios.set(interaction.user.id, {
          nome,
          consultas: []
        });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🧪 Resultado Beta hCG")
              .addFields(
                { name: "Paciente", value: nome },
                { name: "Resultado", value: resultado }
              )
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
      if (interaction.customId === "form_prenatal") {

        const nome = interaction.fields.getTextInputValue("pre0");

        prontuarios.set(interaction.user.id, {
          nome,
          consultas: []
        });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🤰 PRONTUÁRIO PRÉ-NATAL")
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
      if (interaction.customId.startsWith("registro_")) {

        const prontuario = prontuarios.get(interaction.user.id);

        if (!prontuario) {
          return interaction.reply({
            content: "❌ Nenhum prontuário encontrado.",
            flags: 64
          });
        }

        const numero = interaction.customId.split("_")[1];
        const info = interaction.fields.getTextInputValue("info");

        prontuario.consultas.push({ numero, info });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`📋 Consulta ${numero} registrada`)
              .setDescription(info)
              .setColor("Green")
          ]
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
