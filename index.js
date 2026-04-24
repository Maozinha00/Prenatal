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
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const CATEGORY_ID = "1492387782394515466";

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

// ===== ASSINATURA CRM =====
function assinaturaCRM(nome, crm) {
  return `👨‍⚕️ Dr(a). ${nome} | CRM ${crm} | 🖊️ Assinado digitalmente`;
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

    const db = loadDB();

    // ================= PAINEL =================
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
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("admin")
            .setLabel("🧑‍💻 Admin")
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          content: "🏥 **Hospital Bella - Sistema Completo**",
          components: [row]
        });
      }
    }

    // ================= TESTE =================
    if (interaction.isButton() && interaction.customId === "teste") {

      const modal = new ModalBuilder()
        .setCustomId("teste_form")
        .setTitle("🧪 Teste de Gravidez");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Nome completo").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("medico").setLabel("Médico responsável").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("crm").setLabel("CRM").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.customId === "teste_form") {

      await interaction.deferReply({ flags: 64 });

      const nome = interaction.fields.getTextInputValue("nome");
      const medicoNome = interaction.fields.getTextInputValue("medico");
      const crm = interaction.fields.getTextInputValue("crm");

      const valor = Math.floor(Math.random() * 30000) + 1;
      const resultado = resultadoHCG(valor);

      if (!db[nome]) {
        db[nome] = {
          medico: {},
          consultas: {},
          canal: null
        };
      }

      db[nome].medico = { nome: medicoNome, crm };

      if (!db[nome].canal) {
        const canal = await interaction.guild.channels.create({
          name: `🧪-${nome}`,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID
        });

        db[nome].canal = canal.id;
      }

      saveDB(db);

      const canal = await interaction.guild.channels.fetch(db[nome].canal);

      await canal.send(`
# 🧪 PRONTUÁRIO - TESTE DE GRAVIDEZ

👩 Paciente: ${nome}
👨‍⚕️ Médico: ${medicoNome} (CRM ${crm})

🧪 HCG: ${valor} mUI/mL
📌 Resultado: ${resultado}

${assinaturaCRM(medicoNome, crm)}
`);

      return interaction.editReply("✅ Teste registrado com sucesso!");
    }

    // ================= PRÉ NATAL =================
    if (interaction.isButton() && interaction.customId === "prenatal") {

      const modal = new ModalBuilder()
        .setCustomId("prenatal_form")
        .setTitle("🤰 Pré-natal");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Nome da paciente").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.customId === "prenatal_form") {

      await interaction.deferReply({ flags: 64 });

      const nome = interaction.fields.getTextInputValue("nome");

      if (!db[nome]) {
        db[nome] = {
          medico: {},
          consultas: {},
          canal: null
        };
      }

      if (!db[nome].canal) {
        const canal = await interaction.guild.channels.create({
          name: `🤰-${nome}`,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID
        });

        db[nome].canal = canal.id;
      }

      saveDB(db);

      const canal = await interaction.guild.channels.fetch(db[nome].canal);

      const rows = [];
      let row = new ActionRowBuilder();

      for (let i = 1; i <= 17; i++) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`consulta_${nome}_${i}`)
            .setLabel(`${i}ª consulta`)
            .setStyle(ButtonStyle.Primary)
        );

        if (i % 5 === 0 || i === 17) {
          rows.push(row);
          row = new ActionRowBuilder();
        }
      }

      await canal.send({
        content: `🤰 PRÉ-NATAL INICIADO - ${nome}`,
        components: rows
      });

      return interaction.editReply("✅ Pré-natal iniciado!");
    }

    // ================= CONSULTAS =================
    if (interaction.customId?.startsWith("consulta_")) {

      const [, nome, num] = interaction.customId.split("_");

      if (!db[nome]) return;

      db[nome].consultas[num] = {
        data: new Date().toISOString(),
        medico: db[nome].medico
      };

      saveDB(db);

      const canal = await interaction.guild.channels.fetch(db[nome].canal);

      await canal.send(`
🤰 CONSULTA ${num}
👩 Paciente: ${nome}
👨‍⚕️ Médico: ${db[nome].medico.nome}
🏷️ CRM: ${db[nome].medico.crm}

🖊️ ${assinaturaCRM(db[nome].medico.nome, db[nome].medico.crm)}
`);

      return interaction.reply({ content: `✔ Consulta ${num} registrada`, ephemeral: true });
    }

    // ================= ADMIN =================
    if (interaction.customId === "admin") {

      const db = loadDB();

      const embed = new EmbedBuilder()
        .setTitle("🧑‍💻 PAINEL ADMIN")
        .setDescription(`👩 Pacientes ativos: ${Object.keys(db).length}`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("listar")
          .setLabel("📋 Listar pacientes")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("resetdb")
          .setLabel("🗑️ Reset DB")
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ================= LISTAR =================
    if (interaction.customId === "listar") {

      const db = loadDB();

      const lista = Object.keys(db)
        .map((p, i) => `**${i + 1}.** ${p}`)
        .join("\n") || "Nenhum paciente";

      return interaction.reply({
        content: `📋 PACIENTES:\n\n${lista}`,
        ephemeral: true
      });
    }

    // ================= RESET =================
    if (interaction.customId === "resetdb") {
      fs.writeFileSync("database.json", "{}");
      return interaction.reply({ content: "🗑️ Banco resetado!", ephemeral: true });
    }

  } catch (err) {
    console.log(err);
  }
});

// ===== LOGIN =====
client.login(TOKEN);
