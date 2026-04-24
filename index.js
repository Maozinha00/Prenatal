import "dotenv/config";
import {
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
} from "discord.js";

import fs from "fs";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const CATEGORY_ID = "1492387782394515466";

// ===== DATABASE =====
function loadDB() {
  if (!fs.existsSync("database.json")) return {};
  return JSON.parse(fs.readFileSync("database.json"));
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

// ===== IA MÉDICA =====
function iaMedica(txt = "") {
  const t = txt.toLowerCase();

  if (t.includes("sangramento") || t.includes("dor forte")) return "🔴 RISCO ALTO";
  if (t.includes("febre") || t.includes("tontura")) return "🟠 ATENÇÃO";
  if (t.includes("náusea") || t.includes("cansaço")) return "🟡 NORMAL GRAVIDEZ";

  return "🟢 NORMAL";
}

// ===== BETA HCG =====
function resultadoHCG(valor) {
  if (valor < 5) return "NEGATIVO ❌";
  if (valor <= 25) return "INDETERMINADO ⚠";
  return "POSITIVO ✔";
}

// ===== READY =====
client.once("clientReady", async () => {
  console.log("🔥 BOT ONLINE:", client.user.tag);

  const commands = [
    new SlashCommandBuilder().setName("painel").setDescription("Abrir painel hospital")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {

  const db = loadDB();

  // ===== PAINEL =====
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prenatal").setLabel("🤰 Pré-natal").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("beta").setLabel("💉 Beta HCG").setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        content: "🏥 **HOSPITAL BELLA - SISTEMA PREMIUM**",
        components: [row]
      });
    }
  }

  // ===== BETA HCG =====
  if (interaction.isButton() && interaction.customId === "beta") {

    const modal = new ModalBuilder()
      .setCustomId("beta_modal")
      .setTitle("Exame Beta HCG");

    ["nome", "valor"].forEach(id => {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(id)
            .setLabel(id === "nome" ? "Nome da paciente" : "Resultado (mUI/mL)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    });

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "beta_modal") {

    const nome = interaction.fields.getTextInputValue("nome");
    const valor = Number(interaction.fields.getTextInputValue("valor"));

    return interaction.reply(`
🏥 **CENTRO MÉDICO BELLA**

🧪 EXAME: BETA HCG
👩 Paciente: ${nome}
📊 Resultado: ${valor} mUI/mL

📋 Conclusão: **${resultadoHCG(valor)}**
`);
  }

  // ===== PRÉ-NATAL =====
  if (interaction.isButton() && interaction.customId === "prenatal") {

    const modal = new ModalBuilder()
      .setCustomId("prenatal_full")
      .setTitle("CHECK-IN COMPLETO");

    const campos = [
      ["nome", "Nome"],
      ["idade", "Idade"],
      ["rg", "RG"],
      ["bebes", "Qtd bebês"],
      ["sexo", "Sexo bebê"]
    ];

    campos.forEach(c => {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(c[0])
            .setLabel(c[1])
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    });

    return interaction.showModal(modal);
  }

  // ===== SALVAR PRÉ NATAL =====
  if (interaction.isModalSubmit() && interaction.customId === "prenatal_full") {

    await interaction.deferReply({ flags: 64 });

    const nome = interaction.fields.getTextInputValue("nome");

    const canal = await interaction.guild.channels.create({
      name: `🤰-${nome}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID
    });

    db[nome] = {
      canal: canal.id,
      consultas: {}
    };

    saveDB(db);

    // ===== BOTÕES =====
    const rows = [];
    let row = new ActionRowBuilder();

    for (let i = 1; i <= 17; i++) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`consulta_${nome}_${i}`)
          .setLabel(`${i}º`)
          .setStyle(ButtonStyle.Success)
      );

      if (i % 5 === 0 || i === 17) {
        rows.push(row);
        row = new ActionRowBuilder();
      }
    }

    const controle = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`parto_${nome}`).setLabel("👶 Registrar Parto").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`encerrar_${nome}`).setLabel("🗂 Encerrar").setStyle(ButtonStyle.Secondary)
    );

    await canal.send({
      content: `# 🤰 CHECK-IN COMPLETO

👩 ${nome}
📋 Prontuário iniciado

Use os botões abaixo para registrar consultas`,
      components: [...rows, controle]
    });

    return interaction.editReply("✔ PRONTUÁRIO CRIADO");
  }

  // ===== CONSULTAS =====
  if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {

    const [, nome, num] = interaction.customId.split("_");

    const modal = new ModalBuilder()
      .setCustomId(`consulta_form_${nome}_${num}`)
      .setTitle(`Consulta ${num}`);

    ["evolucao", "sintomas", "obs"].forEach(f => {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(f)
            .setLabel(f)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    });

    return interaction.showModal(modal);
  }

  // ===== SALVAR CONSULTA =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith("consulta_form_")) {

    await interaction.deferReply({ flags: 64 });

    const [, , nome, num] = interaction.customId.split("_");

    const sintomas = interaction.fields.getTextInputValue("sintomas");

    const canal = await interaction.guild.channels.fetch(db[nome].canal);

    await canal.send(`
📋 CONSULTA ${num}

🧠 IA: ${iaMedica(sintomas)}
📝 ${interaction.fields.getTextInputValue("evolucao")}
`);

    return interaction.editReply("✔ CONSULTA REGISTRADA");
  }

  // ===== PARTO =====
  if (interaction.isButton() && interaction.customId.startsWith("parto_")) {

    const nome = interaction.customId.split("_")[1];

    const modal = new ModalBuilder()
      .setCustomId(`parto_form_${nome}`)
      .setTitle("Registrar Parto");

    ["data", "hora", "medicos"].forEach(f => {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(f)
            .setLabel(f)
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    });

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("parto_form_")) {

    const nome = interaction.customId.split("_")[2];

    const canal = await interaction.guild.channels.fetch(db[nome].canal);

    await canal.send(`
👶 PARTO REGISTRADO

📅 ${interaction.fields.getTextInputValue("data")}
⏰ ${interaction.fields.getTextInputValue("hora")}
👨‍⚕️ ${interaction.fields.getTextInputValue("medicos")}
`);

    return interaction.reply({ content: "✔ PARTO SALVO", flags: 64 });
  }

  // ===== ENCERRAR =====
  if (interaction.isButton() && interaction.customId.startsWith("encerrar_")) {

    const nome = interaction.customId.split("_")[1];

    const canal = await interaction.guild.channels.fetch(db[nome].canal);

    await canal.send("🗂 PRONTUÁRIO ENCERRADO");

    return interaction.reply({ content: "✔ FINALIZADO", flags: 64 });
  }

});

client.login(TOKEN);
