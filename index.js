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

// ===== ASSINATURA =====
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
          new ButtonBuilder().setCustomId("teste").setLabel("🧪 Teste").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("prenatal").setLabel("🤰 Pré-natal").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("admin").setLabel("🧑‍💻 Admin").setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          content: "🏥 **Hospital Bella - Sistema Completo**",
          components: [row]
        });
      }
    }

    // ================= TESTE =================
    if (interaction.customId === "teste") {

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
          new TextInputBuilder().setCustomId("crm").setLabel("CRM").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.customId === "teste_form") {

      await interaction.deferReply({ flags: 64 });

      const nome = interaction.fields.getTextInputValue("nome");
      const medico = interaction.fields.getTextInputValue("medico");
      const crm = interaction.fields.getTextInputValue("crm");

      const valor = Math.floor(Math.random() * 30000) + 1;
      const resultado = resultadoHCG(valor);

      if (!db[nome]) db[nome] = { consultas: {}, medico: {}, canal: null };

      db[nome].medico = { nome: medico, crm };

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
🧪 TESTE DE GRAVIDEZ

👩 Paciente: ${nome}
👨‍⚕️ Médico: ${medico} (CRM ${crm})

📊 HCG: ${valor}
📌 Resultado: ${resultado}

${assinaturaCRM(medico, crm)}
`);

      return interaction.editReply("✔ Teste registrado");
    }

    // ================= PRÉ-NATAL CHECK-IN =================
    if (interaction.customId === "prenatal") {

      const modal = new ModalBuilder()
        .setCustomId("prenatal_form")
        .setTitle("🤰 CHECK-IN PRÉ-NATAL");

      const campos = [
        ["nome", "Nome da mamãe"],
        ["idade", "Idade"],
        ["rg", "RG"],
        ["bebes", "Qtd bebês (1 ou 2)"],
        ["sexo", "Sexo do bebê"],
        ["medico", "Médico responsável"],
        ["parto_dia", "Dia do parto"],
        ["parto_hora", "Hora do parto"],
        ["parto_medico", "Médico do parto"]
      ];

      campos.forEach(c => {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(c[0])
              .setLabel(c[1])
              .setStyle(TextInputStyle.Short)
          )
        );
      });

      return interaction.showModal(modal);
    }

    // ================= SALVAR PRÉ-NATAL =================
    if (interaction.customId === "prenatal_form") {

      await interaction.deferReply({ flags: 64 });

      const data = {
        nome: interaction.fields.getTextInputValue("nome"),
        idade: interaction.fields.getTextInputValue("idade"),
        rg: interaction.fields.getTextInputValue("rg"),
        bebes: interaction.fields.getTextInputValue("bebes"),
        sexo: interaction.fields.getTextInputValue("sexo"),
        medico: interaction.fields.getTextInputValue("medico"),
        parto_dia: interaction.fields.getTextInputValue("parto_dia"),
        parto_hora: interaction.fields.getTextInputValue("parto_hora"),
        parto_medico: interaction.fields.getTextInputValue("parto_medico"),
      };

      if (!db[data.nome]) {
        db[data.nome] = {
          consultas: {},
          medico: { nome: data.medico, crm: "" },
          canal: null,
          prenatal: data
        };
      } else {
        db[data.nome].prenatal = data;
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

      await canal.send({
        content: `
# 🤰📋 PRÉ-NATAL COMPLETO

👩 Nome: ${data.nome}
🎂 Idade: ${data.idade}
🆔 RG: ${data.rg}

👶 Bebês: ${data.bebes}
🚻 Sexo: ${data.sexo}

👨‍⚕️ Médico: ${data.medico}

📅 Parto: ${data.parto_dia} às ${data.parto_hora}
🏥 Equipe: ${data.parto_medico}

━━━━━━━━━━━━━━

💖 CONSULTAS 1–17 (clique para evolução)
`,
        components: rows
      });

      return interaction.editReply("✔ Pré-natal criado com sucesso!");
    }

    // ================= CONSULTAS =================
    if (interaction.customId?.startsWith("consulta_")) {

      const [, nome, num] = interaction.customId.split("_");

      const modal = new ModalBuilder()
        .setCustomId(`consulta_form_${nome}_${num}`)
        .setTitle(`🤰 Consulta ${num}`);

      const perguntas = [
        "Evolução",
        "Sintomas",
        "Observações"
      ];

      perguntas.forEach((p, i) => {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(`q${i}`)
              .setLabel(p)
              .setStyle(TextInputStyle.Short)
          )
        );
      });

      return interaction.showModal(modal);
    }

    // ================= SALVAR CONSULTA =================
    if (interaction.customId.startsWith("consulta_form_")) {

      await interaction.deferReply({ flags: 64 });

      const [, , nome, num] = interaction.customId.split("_");

      const respostas = [];
      interaction.fields.fields.forEach(v => respostas.push(v.value));

      if (!db[nome]) return;

      db[nome].consultas[num] = {
        data: new Date().toISOString(),
        respostas,
        medico: db[nome].medico,
        like: true
      };

      saveDB(db);

      const canal = await interaction.guild.channels.fetch(db[nome].canal);

      await canal.send(`
🤰 CONSULTA ${num} 👍

👩 ${nome}
👨‍⚕️ ${db[nome].medico.nome}

📋 ${respostas.join(" | ")}
`);

      return interaction.editReply("✔ Consulta registrada");
    }

    // ================= ADMIN =================
    if (interaction.customId === "admin") {

      const embed = new EmbedBuilder()
        .setTitle("🧑‍💻 ADMIN HOSPITAL")
        .setDescription(`Pacientes: ${Object.keys(db).length}`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("listar").setLabel("📋 Listar").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("resetdb").setLabel("🗑️ Reset").setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    if (interaction.customId === "listar") {
      const lista = Object.keys(db).map((p, i) => `${i + 1}. ${p}`).join("\n") || "Vazio";
      return interaction.reply({ content: lista, ephemeral: true });
    }

    if (interaction.customId === "resetdb") {
      fs.writeFileSync("database.json", "{}");
      return interaction.reply({ content: "Resetado", ephemeral: true });
    }

  } catch (err) {
    console.log(err);
  }
});

// ===== LOGIN =====
client.login(TOKEN);
