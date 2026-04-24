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

    // ================= COMANDO =================
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
            .setCustomId("prenatal_start")
            .setLabel("🤰 Pré-Natal")
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
      }
    }

    // ================= BOTÕES =================
    if (interaction.isButton()) {

      // ===== GRAVIDEZ =====
      if (interaction.customId === "gravidez") {

        const modal = new ModalBuilder()
          .setCustomId("gravidez_1")
          .setTitle("🩺 Gravidez (1/2)");

        const perguntas = [
          "Nome completo",
          "Última menstruação",
          "Ciclo regular",
          "Dias de atraso",
          "Sintomas"
        ];

        const rows = perguntas.map((p, i) =>
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(`g1_${i}`)
              .setLabel(p)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        modal.addComponents(...rows);

        return interaction.showModal(modal);
      }

      // ===== PRÉ NATAL =====
      if (interaction.customId === "prenatal_start") {

        const modal = new ModalBuilder()
          .setCustomId("prenatal_form")
          .setTitle("🤰 Pré-Natal");

        const campos = [
          "Nome da mamãe",
          "Idade",
          "RG",
          "Quantidade de bebês",
          "Médico responsável"
        ];

        const rows = campos.map((c, i) =>
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(`pre_${i}`)
              .setLabel(c)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        modal.addComponents(...rows);

        return interaction.showModal(modal);
      }

      // ===== CONSULTAS =====
      if (interaction.customId.startsWith("consulta_")) {

        const numero = interaction.customId.split("_")[1];

        const modal = new ModalBuilder()
          .setCustomId(`consulta_${numero}`)
          .setTitle(`Consulta ${numero}`);

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

    // ================= MODAIS =================
    if (interaction.isModalSubmit()) {

      // ===== GRAVIDEZ PARTE 1 =====
      if (interaction.customId === "gravidez_1") {

        prontuarios.set(interaction.user.id, {
          nome: interaction.fields.getTextInputValue("g1_0")
        });

        const modal = new ModalBuilder()
          .setCustomId("gravidez_2")
          .setTitle("🩺 Gravidez (2/2)");

        const perguntas = [
          "Já fez teste?",
          "Usa anticoncepcional?",
          "Já esteve grávida?",
          "Dor ou sangramento?",
          "Exame desejado"
        ];

        const rows = perguntas.map((p, i) =>
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(`g2_${i}`)
              .setLabel(p)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        modal.addComponents(...rows);

        return interaction.showModal(modal);
      }

      // ===== RESULTADO =====
      if (interaction.customId === "gravidez_2") {

        const dados = prontuarios.get(interaction.user.id);

        const resultado = Math.random() > 0.5 ? "POSITIVO" : "NEGATIVO";

        dados.resultado = resultado;
        dados.consultas = [];

        const embed = new EmbedBuilder()
          .setTitle("🧪 RESULTADO BETA HCG")
          .addFields(
            { name: "Paciente", value: dados.nome },
            { name: "Resultado", value: resultado }
          )
          .setColor(resultado === "POSITIVO" ? "Green" : "Red");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prenatal_start")
            .setLabel("➡️ Iniciar Pré-Natal")
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
      }

      // ===== PRÉ NATAL =====
      if (interaction.customId === "prenatal_form") {

        const nome = interaction.fields.getTextInputValue("pre_0");

        prontuarios.set(interaction.user.id, {
          nome,
          consultas: []
        });

        const embed = new EmbedBuilder()
          .setTitle("🤰 PRONTUÁRIO PRÉ-NATAL")
          .setDescription(`Paciente: **${nome}**`)
          .setColor("Orange");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("consulta_1").setLabel("1º").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("consulta_2").setLabel("2º").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("consulta_3").setLabel("3º").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("consulta_4").setLabel("4º").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("consulta_5").setLabel("5º").setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
      }

      // ===== CONSULTA =====
      if (interaction.customId.startsWith("consulta_")) {

        const prontuario = prontuarios.get(interaction.user.id);

        if (!prontuario) {
          return interaction.reply({
            content: "❌ Nenhum prontuário encontrado.",
            flags: 64
          });
        }

        const info = interaction.fields.getTextInputValue("info");

        prontuario.consultas.push({
          numero: interaction.customId.split("_")[1],
          info,
          data: new Date().toLocaleString("pt-BR")
        });

        return interaction.reply({
          content: "✅ Consulta registrada com sucesso!",
          flags: 64
        });
      }
    }

  } catch (err) {
    console.error("❌ ERRO:", err);
  }
});

client.login(TOKEN);
