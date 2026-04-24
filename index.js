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

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const CATEGORY_ID = "1492387782394515466";

// ===== TEMP (pré-natal 2 etapas) =====
const tempPrenatal = {};

// ===== BANCO =====
function loadDB() {
  if (!fs.existsSync("database.json")) return {};
  return JSON.parse(fs.readFileSync("database.json"));
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

// ===== IA MÉDICA SIMPLES =====
function iaMedica(texto) {
  const t = texto.toLowerCase();

  if (t.includes("sangramento") || t.includes("dor forte")) {
    return "⚠ RISCO ALTO - Avaliação imediata recomendada";
  }
  if (t.includes("febre") || t.includes("tontura")) {
    return "⚠ Atenção - monitoramento necessário";
  }
  return "✔ Quadro dentro do esperado";
}

// ===== SEMANAS GESTAÇÃO =====
function semanasGestacao(dataInicio) {
  const inicio = new Date(dataInicio);
  const hoje = new Date();
  const diff = hoje - inicio;
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
}

// ===== READY =====
client.once("clientReady", async () => {
  console.log(`✅ ONLINE: ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("painel")
      .setDescription("Abrir painel hospitalar")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

  console.log("✔ comandos registrados");
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {
  try {

    const db = loadDB();

    // ================= PAINEL =================
    if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("teste").setLabel("🧪 Teste").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("prenatal_1").setLabel("🤰 Pré-natal").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("admin").setLabel("🧑‍💻 Admin").setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        content: "🏥 SISTEMA HOSPITAL BELLA",
        components: [row]
      });
    }

    // ================= TESTE =================
    if (interaction.isButton() && interaction.customId === "teste") {

      const modal = new ModalBuilder()
        .setCustomId("teste_form")
        .setTitle("🧪 Teste de Gravidez");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Nome").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("medico").setLabel("Médico").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sintomas").setLabel("Sintomas").setStyle(TextInputStyle.Paragraph)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "teste_form") {

      await interaction.deferReply({ flags: 64 });

      const nome = interaction.fields.getTextInputValue("nome");
      const medico = interaction.fields.getTextInputValue("medico");
      const sintomas = interaction.fields.getTextInputValue("sintomas");

      const resultadoIA = iaMedica(sintomas);

      if (!db[nome]) db[nome] = { consultas: {}, medico: {}, canal: null };

      db[nome].medico = { nome: medico };

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
🧪 TESTE

👩 ${nome}
👨‍⚕️ ${medico}

🧠 IA: ${resultadoIA}
`);

      return interaction.editReply("✔ Teste concluído");
    }

    // ================= PRÉ-NATAL ETAPA 1 =================
    if (interaction.isButton() && interaction.customId === "prenatal_1") {

      const modal = new ModalBuilder()
        .setCustomId("prenatal_step1")
        .setTitle("🤰 Pré-natal (1/2)");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Nome").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("idade").setLabel("Idade").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("rg").setLabel("RG").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("bebes").setLabel("Qtd bebês").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sexo").setLabel("Sexo bebê").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // ================= PRÉ-NATAL ETAPA 2 =================
    if (interaction.isModalSubmit() && interaction.customId === "prenatal_step1") {

      const id = interaction.user.id;

      tempPrenatal[id] = {
        nome: interaction.fields.getTextInputValue("nome"),
        idade: interaction.fields.getTextInputValue("idade"),
        rg: interaction.fields.getTextInputValue("rg"),
        bebes: interaction.fields.getTextInputValue("bebes"),
        sexo: interaction.fields.getTextInputValue("sexo")
      };

      const modal = new ModalBuilder()
        .setCustomId("prenatal_step2")
        .setTitle("🤰 Pré-natal (2/2)");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("medico").setLabel("Médico").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("parto_dia").setLabel("Dia parto").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("parto_hora").setLabel("Hora parto").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // ================= SALVAR PRÉ-NATAL =================
    if (interaction.isModalSubmit() && interaction.customId === "prenatal_step2") {

      await interaction.deferReply({ flags: 64 });

      const id = interaction.user.id;
      const step1 = tempPrenatal[id];

      const medico = interaction.fields.getTextInputValue("medico");
      const parto_dia = interaction.fields.getTextInputValue("parto_dia");
      const parto_hora = interaction.fields.getTextInputValue("parto_hora");

      const data = {
        ...step1,
        medico,
        parto_dia,
        parto_hora,
        inicio: new Date().toISOString()
      };

      if (!db[data.nome]) {
        db[data.nome] = {
          consultas: {},
          medico: { nome: medico },
          canal: null,
          prenatal: data
        };
      }

      if (!db[data.nome].canal) {
        const canal = await interaction.guild.channels.create({
          name: `🤰-${data.nome}`,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID
        });

        db[data.nome].canal = canal.id;
      }

      saveDB(db);

      const canal = await interaction.guild.channels.fetch(db[data.nome].canal);

      const rows = [];
      let row = new ActionRowBuilder();

      for (let i = 1; i <= 17; i++) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`consulta_${data.nome}_${i}`)
            .setLabel(`👍 ${i}`)
            .setStyle(ButtonStyle.Success)
        );

        if (i % 5 === 0 || i === 17) {
          rows.push(row);
          row = new ActionRowBuilder();
        }
      }

      const semanas = semanasGestacao(data.inicio);

      await canal.send({
        content: `
# 🤰 PRÉ-NATAL

👩 ${data.nome}
🎂 ${data.idade}
🆔 ${data.rg}

👶 ${data.bebes}
🚻 ${data.sexo}

👨‍⚕️ ${data.medico}

📅 Parto: ${data.parto_dia} ${data.parto_hora}

📊 Semana gestação: ${semanas}

✔ Acompanhar consultas 1–17
`,
        components: rows
      });

      delete tempPrenatal[id];

      return interaction.editReply("✔ Pré-natal criado com sucesso");
    }

    // ================= CONSULTAS =================
    if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {

      const [, nome, num] = interaction.customId.split("_");

      const modal = new ModalBuilder()
        .setCustomId(`consulta_form_${nome}_${num}`)
        .setTitle(`Consulta ${num}`);

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("evolucao").setLabel("Evolução").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sintomas").setLabel("Sintomas").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("obs").setLabel("Observações").setStyle(TextInputStyle.Paragraph)
        )
      );

      return interaction.showModal(modal);
    }

    // ================= SALVAR CONSULTA =================
    if (interaction.isModalSubmit() && interaction.customId.startsWith("consulta_form_")) {

      await interaction.deferReply({ flags: 64 });

      const [, , nome, num] = interaction.customId.split("_");

      const evolucao = interaction.fields.getTextInputValue("evolucao");
      const sintomas = interaction.fields.getTextInputValue("sintomas");
      const obs = interaction.fields.getTextInputValue("obs");

      if (!db[nome]) return;

      db[nome].consultas[num] = {
        evolucao,
        sintomas,
        obs,
        status: "✔"
      };

      saveDB(db);

      const canal = await interaction.guild.channels.fetch(db[nome].canal);

      await canal.send(`
🤰 CONSULTA ${num} ✔

Evolução: ${evolucao}
Sintomas: ${sintomas}
Obs: ${obs}

🧠 IA: ${iaMedica(sintomas)}
`);

      return interaction.editReply("✔ Consulta salva");
    }

  } catch (err) {
    console.log(err);
  }
});

client.login(TOKEN);
