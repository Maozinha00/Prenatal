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

// 🔐 CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CATEGORIA_ID = "1492387782394515466";

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
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Comandos registrados");
})();

// ================= READY =================
client.once("clientReady", () => {
  console.log(`🤖 Online como ${client.user.tag}`);
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async (interaction) => {
  try {

    // ========= COMANDO =========
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

    // ========= BOTÕES =========
    if (interaction.isButton()) {

      // ===== TESTE GRAVIDEZ =====
      if (interaction.customId === "gravidez") {

        const modal = new ModalBuilder()
          .setCustomId("form_gravidez")
          .setTitle("🩺 Teste de Gravidez");

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

      // ===== PRÉ NATAL =====
      if (interaction.customId === "prenatal") {

        const modal = new ModalBuilder()
          .setCustomId("form_prenatal")
          .setTitle("🤰 Check-in Pré-Natal");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("nome")
              .setLabel("Nome da paciente")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("idade")
              .setLabel("Idade")
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("rg")
              .setLabel("RG")
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("bebes")
              .setLabel("Quantidade de bebês")
              .setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("medico")
              .setLabel("Médico responsável")
              .setStyle(TextInputStyle.Short)
          )
        );

        return interaction.showModal(modal);
      }

      // ===== CONSULTAS (COM PROGRESSÃO) =====
      if (interaction.customId.startsWith("consulta_")) {

        const numero = parseInt(interaction.customId.split("_")[1]);
        const prontuario = prontuarios.get(interaction.user.id);

        if (!prontuario) {
          return interaction.reply({ content: "❌ Sem prontuário.", flags: 64 });
        }

        const proxima = prontuario.consultas.length + 1;

        if (numero !== proxima) {
          return interaction.reply({
            content: `❌ Faça a consulta ${proxima} primeiro.`,
            flags: 64
          });
        }

        const modal = new ModalBuilder()
          .setCustomId(`consulta_modal_${numero}`)
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

    // ========= MODAIS =========
    if (interaction.isModalSubmit()) {

      // ===== RESULTADO GRAVIDEZ =====
      if (interaction.customId === "form_gravidez") {

        const nome = interaction.fields.getTextInputValue("nome");
        const resultado = Math.random() > 0.5 ? "POSITIVO" : "NEGATIVO";

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🧪 Resultado Beta hCG")
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

      // ===== CRIAR PRONTUÁRIO =====
      if (interaction.customId === "form_prenatal") {

        const nome = interaction.fields.getTextInputValue("nome");
        const idade = interaction.fields.getTextInputValue("idade");
        const rg = interaction.fields.getTextInputValue("rg");
        const bebes = interaction.fields.getTextInputValue("bebes");
        const medico = interaction.fields.getTextInputValue("medico");

        const canal = await interaction.guild.channels.create({
          name: `🩺-${nome}`,
          type: ChannelType.GuildText,
          parent: CATEGORIA_ID
        });

        const embed = new EmbedBuilder()
          .setTitle("🤰📋 CHECK-IN DE PRÉ-NATAL")
          .setColor("Orange")
          .setDescription(`
👩 **Nome:** ${nome}
🎂 **Idade:** ${idade}
🆔 **RG:** ${rg}

👶 **Bebês:** ${bebes}

📅 **Data:** ${new Date().toLocaleDateString("pt-BR")}
⏰ **Hora:** ${new Date().toLocaleTimeString("pt-BR")}
👨‍⚕️ **Médico:** ${medico}

---

📋 **Consultas**
`);

        const rows = [];
        let linha = new ActionRowBuilder();

        for (let i = 1; i <= 17; i++) {

          linha.addComponents(
            new ButtonBuilder()
              .setCustomId(`consulta_${i}`)
              .setLabel(i === 1 ? "1º" : `${i}º`)
              .setStyle(i === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary)
          );

          if (i % 5 === 0 || i === 17) {
            rows.push(linha);
            linha = new ActionRowBuilder();
          }
        }

        await canal.send({ embeds: [embed], components: rows });

        prontuarios.set(interaction.user.id, {
          nome,
          canalId: canal.id,
          consultas: []
        });

        return interaction.reply({
          content: `✅ Prontuário criado: ${canal}`,
          flags: 64
        });
      }

      // ===== REGISTRAR CONSULTA =====
      if (interaction.customId.startsWith("consulta_modal_")) {

        const numero = parseInt(interaction.customId.split("_")[2]);
        const info = interaction.fields.getTextInputValue("info");

        const prontuario = prontuarios.get(interaction.user.id);
        const canal = interaction.guild.channels.cache.get(prontuario.canalId);

        prontuario.consultas.push(numero);

        await canal.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(`📋 Consulta ${numero}`)
              .setDescription(info)
              .setColor("Green")
          ]
        });

        // atualizar botões
        const rows = [];
        let linha = new ActionRowBuilder();

        for (let i = 1; i <= 17; i++) {

          let estilo = ButtonStyle.Secondary;
          let label = `${i}º`;

          if (prontuario.consultas.includes(i)) {
            estilo = ButtonStyle.Success;
            label = `✔ ${i}`;
          } else if (i === prontuario.consultas.length + 1) {
            estilo = ButtonStyle.Primary;
          }

          linha.addComponents(
            new ButtonBuilder()
              .setCustomId(`consulta_${i}`)
              .setLabel(label)
              .setStyle(estilo)
          );

          if (i % 5 === 0 || i === 17) {
            rows.push(linha);
            linha = new ActionRowBuilder();
          }
        }

        const msgs = await canal.messages.fetch({ limit: 10 });
        const botMsg = msgs.find(m => m.author.id === client.user.id);

        if (botMsg) await botMsg.edit({ components: rows });

        return interaction.reply({
          content: `✅ Consulta ${numero} registrada!`,
          flags: 64
        });
      }
    }

  } catch (err) {
    console.error("❌ ERRO:", err);
  }
});

client.login(TOKEN);
