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

// ===== TEMP SAFE =====
const tempPrenatal = {};

// ===== DB SAFE =====
function loadDB() {
  try {
    if (!fs.existsSync("database.json")) return {};
    return JSON.parse(fs.readFileSync("database.json", "utf8"));
  } catch {
    return {};
  }
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

// ===== IA SIMPLES =====
function iaMedica(txt = "") {
  const t = txt.toLowerCase();
  if (t.includes("dor forte") || t.includes("sangramento")) return "⚠ RISCO ALTO";
  if (t.includes("febre")) return "⚠ ATENÇÃO";
  return "✔ NORMAL";
}

// ===== SEMANAS =====
function semanasGestacao(data) {
  if (!data) return 0;
  const diff = Date.now() - new Date(data);
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
}

// ===== READY =====
client.once("clientReady", async () => {
  console.log("BOT ONLINE:", client.user.tag);

  const commands = [
    new SlashCommandBuilder()
      .setName("painel")
      .setDescription("Abrir painel hospital")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {
  try {

    const db = loadDB();

    // ================= PAINEL =================
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prenatal_1").setLabel("🤰 Pré-natal").setStyle(ButtonStyle.Success)
        );

        return interaction.reply({
          content: "🏥 SISTEMA",
          components: [row]
        });
      }
    }

    // ================= PRÉ-NATAL STEP 1 =================
    if (interaction.isButton() && interaction.customId === "prenatal_1") {

      const modal = new ModalBuilder()
        .setCustomId("prenatal_step1")
        .setTitle("Pré-natal 1/2");

      const fields = [
        ["nome", "Nome"],
        ["idade", "Idade"],
        ["rg", "RG"]
      ];

      fields.forEach(f => {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(f[0])
              .setLabel(f[1])
              .setStyle(TextInputStyle.Short)
          )
        );
      });

      return interaction.showModal(modal);
    }

    // ================= STEP 1 =================
    if (interaction.isModalSubmit() && interaction.customId === "prenatal_step1") {

      const id = interaction.user.id;

      tempPrenatal[id] = {
        nome: interaction.fields.getTextInputValue("nome"),
        idade: interaction.fields.getTextInputValue("idade"),
        rg: interaction.fields.getTextInputValue("rg")
      };

      const modal = new ModalBuilder()
        .setCustomId("prenatal_step2")
        .setTitle("Pré-natal 2/2");

      const fields = [
        ["bebes", "Qtd bebês"],
        ["sexo", "Sexo"],
        ["medico", "Médico"]
      ];

      fields.forEach(f => {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(f[0])
              .setLabel(f[1])
              .setStyle(TextInputStyle.Short)
          )
        );
      });

      return interaction.showModal(modal);
    }

    // ================= STEP 2 FINAL =================
    if (interaction.isModalSubmit() && interaction.customId === "prenatal_step2") {

      await interaction.deferReply({ flags: 64 });

      const id = interaction.user.id;
      const step1 = tempPrenatal[id] || {};

      const data = {
        nome: step1.nome,
        idade: step1.idade,
        rg: step1.rg,
        bebes: interaction.fields.getTextInputValue("bebes"),
        sexo: interaction.fields.getTextInputValue("sexo"),
        medico: interaction.fields.getTextInputValue("medico"),
        inicio: new Date().toISOString()
      };

      if (!data.nome) {
        return interaction.editReply("❌ erro nos dados");
      }

      if (!db[data.nome]) {
        db[data.nome] = {
          consultas: {},
          canal: null,
          medico: { nome: data.medico },
          prenatal: data
        };
      }

      if (!db[data.nome].canal) {
        const canal = await interaction.guild.channels.create({
          name: `prenatal-${data.nome}`,
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

      await canal.send({
        content: `
🤰 PRÉ-NATAL

👩 ${data.nome}
🎂 ${data.idade}
🆔 ${data.rg}

👶 ${data.bebes}
🚻 ${data.sexo}

👨‍⚕️ ${data.medico}

📊 Semanas: ${semanasGestacao(data.inicio)}
`,
        components: rows
      });

      delete tempPrenatal[id];

      return interaction.editReply("✔ PRÉ-NATAL CRIADO COM SUCESSO");
    }

    // ================= CONSULTA =================
    if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {

      const [, nome, num] = interaction.customId.split("_");

      const modal = new ModalBuilder()
        .setCustomId(`consulta_form_${nome}_${num}`)
        .setTitle(`Consulta ${num}`);

      const fields = [
        ["evolucao", "Evolução"],
        ["sintomas", "Sintomas"],
        ["obs", "Observações"]
      ];

      fields.forEach(f => {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(f[0])
              .setLabel(f[1])
              .setStyle(TextInputStyle.Short)
          )
        );
      });

      return interaction.showModal(modal);
    }

    // ================= SALVAR CONSULTA =================
    if (interaction.isModalSubmit() && interaction.customId.startsWith("consulta_form_")) {

      await interaction.deferReply({ flags: 64 });

      const [, , nome, num] = interaction.customId.split("_");

      const evolucao = interaction.fields.getTextInputValue("evolucao");
      const sintomas = interaction.fields.getTextInputValue("sintomas");
      const obs = interaction.fields.getTextInputValue("obs");

      if (!db[nome]) return interaction.editReply("❌ paciente não encontrado");

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

      return interaction.editReply("✔ SALVO");
    }

  } catch (err) {
    console.log("ERRO:", err);
  }
});

client.login(TOKEN);
