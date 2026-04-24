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

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CATEGORY_ID = "1492387782394515466";

// ===== MEMÓRIA =====
const temp = {};

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

// ===== INTERAÇÃO =====
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
          content: "🏥 **Hospital Bella Premium**",
          components: [row]
        });
      }
    }

    // ===== START =====
    if (interaction.isButton() && interaction.customId === "start") {

      const modal = new ModalBuilder()
        .setCustomId("p1")
        .setTitle("🩺 Parte 1/4");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Nome completo").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("idade").setLabel("Idade").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("rg").setLabel("RG").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("menstruacao").setLabel("Última menstruação").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("ciclo").setLabel("Ciclo regular?").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // ===== PARTE 1 → BOTÃO =====
    if (interaction.isModalSubmit() && interaction.customId === "p1") {

      temp[interaction.user.id] = {
        nome: interaction.fields.getTextInputValue("nome"),
        idade: interaction.fields.getTextInputValue("idade"),
        rg: interaction.fields.getTextInputValue("rg"),
        menstruacao: interaction.fields.getTextInputValue("menstruacao"),
        ciclo: interaction.fields.getTextInputValue("ciclo")
      };

      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("p2")
          .setLabel("➡️ Próxima Parte")
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({
        content: "✅ Parte 1 concluída",
        components: [btn],
        ephemeral: true
      });
    }

    // ===== PARTE 2 =====
    if (interaction.isButton() && interaction.customId === "p2") {

      const modal = new ModalBuilder()
        .setCustomId("p2_modal")
        .setTitle("🩺 Parte 2/4");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("atraso").setLabel("Atraso menstrual (dias)").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sintomas").setLabel("Sintomas").setStyle(TextInputStyle.Paragraph)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("teste").setLabel("Fez teste?").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("medicamento").setLabel("Anticoncepcional?").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("gravidez").setLabel("Já esteve grávida?").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "p2_modal") {

      Object.assign(temp[interaction.user.id], {
        atraso: interaction.fields.getTextInputValue("atraso"),
        sintomas: interaction.fields.getTextInputValue("sintomas"),
        teste: interaction.fields.getTextInputValue("teste"),
        medicamento: interaction.fields.getTextInputValue("medicamento"),
        gravidez: interaction.fields.getTextInputValue("gravidez")
      });

      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("p3")
          .setLabel("➡️ Próxima Parte")
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({
        content: "✅ Parte 2 concluída",
        components: [btn],
        ephemeral: true
      });
    }

    // ===== PARTE 3 =====
    if (interaction.isButton() && interaction.customId === "p3") {

      const modal = new ModalBuilder()
        .setCustomId("p3_modal")
        .setTitle("🩺 Parte 3/4");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("dor").setLabel("Dor ou sangramento?").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("bebes").setLabel("Quantidade de bebês").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sexo_bebe").setLabel("Sexo do bebê").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("medico").setLabel("Médico responsável").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("exame").setLabel("Tipo de exame").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "p3_modal") {

      Object.assign(temp[interaction.user.id], {
        dor: interaction.fields.getTextInputValue("dor"),
        bebes: interaction.fields.getTextInputValue("bebes"),
        sexo: interaction.fields.getTextInputValue("sexo_bebe"),
        medico: interaction.fields.getTextInputValue("medico"),
        exame: interaction.fields.getTextInputValue("exame")
      });

      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("finalizar")
          .setLabel("✅ Finalizar Atendimento")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: "✅ Parte 3 concluída",
        components: [btn],
        ephemeral: true
      });
    }

    // ===== FINAL =====
    if (interaction.isButton() && interaction.customId === "finalizar") {

      await interaction.deferReply({ ephemeral: true });

      const d = temp[interaction.user.id];

      const valor = Math.floor(Math.random() * 30000) + 1;
      const resultado = resultadoHCG(valor);

      const canal = await interaction.guild.channels.create({
        name: `🩺-${d.nome}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      await canal.send(`
# 🤰📋 CHECK-IN COMPLETO

👩 Nome: ${d.nome}
🎂 Idade: ${d.idade}
🆔 RG: ${d.rg}

👶 Bebês: ${d.bebes}
🚻 Sexo: ${d.sexo}

👨‍⚕️ Médico: ${d.medico}

━━━━━━━━━━━━━━━━━━

🧪 RESULTADO

${valor} mUI/mL
Conclusão: **${resultado}**
`);

      delete temp[interaction.user.id];

      return interaction.editReply("🎉 Atendimento PREMIUM finalizado!");
    }

  } catch (err) {
    console.log("ERRO:", err);
  }
});

client.login(TOKEN);
