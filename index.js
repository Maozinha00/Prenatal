import "dotenv/config";
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
  Routes,
  ChannelType
} from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ================= BANCO SIMPLES =================
const prontuarios = new Map();

// ================= COMANDOS =================
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel Hospital Bella")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Comandos registrados");
})();

// ================= BOT =================
client.on("ready", () => {
  console.log(`🤖 Online como ${client.user.tag}`);
});

// ================= PAINEL =================
client.on("interactionCreate", async (interaction) => {

  // ========= COMANDO =========
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

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // ========= BOTÃO TESTE =========
  if (interaction.isButton()) {

    // ===== TESTE DE GRAVIDEZ =====
    if (interaction.customId === "gravidez") {

      const modal = new ModalBuilder()
        .setCustomId("form_gravidez")
        .setTitle("🩺 Questionário Gravidez");

      const perguntas = [
        "Nome completo",
        "Última menstruação",
        "Ciclo regular?",
        "Dias de atraso",
        "Sintomas",
        "Já fez teste?",
        "Usa anticoncepcional?",
        "Já esteve grávida?",
        "Dor ou sangramento?",
        "Exame desejado"
      ];

      const inputs = perguntas.map((p, i) =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`p${i}`)
            .setLabel(p)
            .setStyle(TextInputStyle.Short)
        )
      );

      modal.addComponents(...inputs.slice(0, 5)); // limite modal

      await interaction.showModal(modal);
    }

    // ===== ABRIR PRÉ NATAL =====
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
        )
      );

      modal.addComponents(...inputs);

      await interaction.showModal(modal);
    }

    // ===== CONSULTAS =====
    if (interaction.customId.startsWith("consulta_")) {

      const numero = interaction.customId.split("_")[1];

      const modal = new ModalBuilder()
        .setCustomId(`registro_${numero}`)
        .setTitle(`📝 Consulta ${numero}`);

      const campo = new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("info")
          .setLabel("Informações da consulta")
          .setStyle(TextInputStyle.Paragraph)
      );

      modal.addComponents(campo);

      await interaction.showModal(modal);
    }
  }

  // ========= MODAL =========
  if (interaction.isModalSubmit()) {

    // ===== RESULTADO TESTE =====
    if (interaction.customId === "form_gravidez") {

      const nome = interaction.fields.getTextInputValue("p0");

      const resultado = Math.random() > 0.5 ? "POSITIVO" : "NEGATIVO";

      prontuarios.set(interaction.user.id, {
        nome,
        consultas: []
      });

      const embed = new EmbedBuilder()
        .setTitle("🧪 Resultado Beta hCG")
        .addFields(
          { name: "Paciente", value: nome },
          { name: "Resultado", value: resultado }
        )
        .setColor(resultado === "POSITIVO" ? "Green" : "Red");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prenatal")
          .setLabel("➡️ Iniciar Pré-Natal")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }

    // ===== CRIAR PRÉ NATAL =====
    if (interaction.customId === "form_prenatal") {

      const nome = interaction.fields.getTextInputValue("pre0");

      const embed = new EmbedBuilder()
        .setTitle("🤰 PRONTUÁRIO PRÉ-NATAL")
        .setDescription(`Paciente: **${nome}**`)
        .setColor("Orange");

      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("consulta_1")
          .setLabel("1º Consulta")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("consulta_2")
          .setLabel("2º Consulta")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("consulta_3")
          .setLabel("3º Consulta")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        embeds: [embed],
        components: [botoes]
      });
    }

    // ===== REGISTRAR CONSULTA =====
    if (interaction.customId.startsWith("registro_")) {

      const numero = interaction.customId.split("_")[1];
      const info = interaction.fields.getTextInputValue("info");

      const prontuario = prontuarios.get(interaction.user.id);

      prontuario.consultas.push({
        numero,
        info
      });

      const embed = new EmbedBuilder()
        .setTitle(`📋 Consulta ${numero} registrada`)
        .setDescription(info)
        .setColor("Green");

      await interaction.reply({ embeds: [embed] });
    }
  }
});

client.login(TOKEN);
