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

// ===== CONFIG =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const CATEGORY_ID = "1492387782394515466";
const ACAO_CHANNEL_ID = "1477683906642706507";

// ===== BANCO =====
function loadDB() {
  try {
    if (!fs.existsSync("database.json")) return {};
    return JSON.parse(fs.readFileSync("database.json"));
  } catch {
    return {};
  }
}

function saveDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

// ===== RESULTADO HCG =====
function resultadoHCG(valor) {
  if (valor < 5) return "NEGATIVO";
  if (valor >= 5 && valor <= 25) return "INCONCLUSIVO";
  if (valor > 25) return "POSITIVO";
}

// ===== SLASH =====
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel hospitalar")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ /painel registrado");
})();

// ===== ONLINE =====
client.once("ready", () => {
  console.log(`🏥 ONLINE: ${client.user.tag}`);
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {
  try {

    // ===== PAINEL =====
    if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("iniciar")
          .setLabel("🤰 Iniciar Atendimento")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: "🏥 Sistema Hospital Bella",
        components: [row]
      });
    }

    // ===== INICIAR =====
    if (interaction.isButton() && interaction.customId === "iniciar") {

      const modal = new ModalBuilder()
        .setCustomId("inicio")
        .setTitle("🩺 Questionário – Gravidez");

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
          new TextInputBuilder().setCustomId("bebes").setLabel("Qtd bebês (1 ou 2)").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sexo").setLabel("Sexo do bebê").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // ===== SALVAR =====
    if (interaction.isModalSubmit() && interaction.customId === "inicio") {

      await interaction.deferReply({ ephemeral: true });

      const db = loadDB();
      const id = Date.now().toString();

      const canal = await interaction.guild.channels.create({
        name: `🩺-${interaction.fields.getTextInputValue("nome")}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID
      });

      db[id] = {
        nome: interaction.fields.getTextInputValue("nome"),
        idade: interaction.fields.getTextInputValue("idade"),
        rg: interaction.fields.getTextInputValue("rg"),
        bebes: interaction.fields.getTextInputValue("bebes"),
        sexo: interaction.fields.getTextInputValue("sexo"),
        consultas: [],
        channelId: canal.id
      };

      saveDB(db);

      // ===== CHECK-IN PRÉ-NATAL =====
      const checkin = `
# 🤰📋 CHECK-IN DE PRÉ-NATAL 📋🤰

## 👩 DADOS DA PACIENTE
👩 Nome: ${db[id].nome}
🎂 Idade: ${db[id].idade}
🆔 RG: ${db[id].rg}

👶 Bebês: ${db[id].bebes}
🚻 Sexo: ${db[id].sexo}

📅 Data: ${new Date().toLocaleDateString()}
⏰ Horário: ${new Date().toLocaleTimeString()}
👨‍⚕️ Médico: ${interaction.user}

────────────────────────────

## 💕 CONSULTAS
`;

      let lista = "";
      for (let i = 1; i <= 17; i++) {
        lista += `${i}º Pré-natal\n`;
      }

      await canal.send(checkin + lista);

      // ===== BOTÕES =====
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`consulta_${id}`)
          .setLabel("➕ Consulta")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`exame_${id}`)
          .setLabel("🧪 Exame")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`parto_${id}`)
          .setLabel("🏥 Parto")
          .setStyle(ButtonStyle.Danger)
      );

      const canalAcoes = interaction.guild.channels.cache.get(ACAO_CHANNEL_ID);

      if (canalAcoes) {
        await canalAcoes.send({
          content: `👩 Paciente: ${db[id].nome}`,
          components: [row]
        });
      }

      return interaction.editReply("✅ Paciente registrada!");
    }

    // ===== CONSULTA =====
    if (interaction.isButton() && interaction.customId.startsWith("consulta_")) {

      const id = interaction.customId.split("_")[1];
      const db = loadDB();

      db[id].consultas.push(new Date().toLocaleDateString());
      saveDB(db);

      return interaction.reply({
        content: `✅ Consulta registrada (${db[id].consultas.length}/17)`,
        ephemeral: true
      });
    }

    // ===== EXAME =====
    if (interaction.isButton() && interaction.customId.startsWith("exame_")) {

      const id = interaction.customId.split("_")[1];

      const modal = new ModalBuilder()
        .setCustomId(`exame_${id}`)
        .setTitle("Resultado Beta HCG");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("valor")
            .setLabel("Valor (mUI/mL)")
            .setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("exame_")) {

      await interaction.deferReply({ ephemeral: true });

      const id = interaction.customId.split("_")[1];
      const db = loadDB();

      const valor = Number(interaction.fields.getTextInputValue("valor"));
      const resultado = resultadoHCG(valor);

      const canal = interaction.guild.channels.cache.get(db[id].channelId);

      const exame = `
# 🏥 EXAME LABORATORIAL

🧪 BETA HCG
📊 Resultado: ${valor} mUI/mL

📌 Conclusão: ${resultado}

🟠 >25 POSITIVO
🟡 5-25 INCONCLUSIVO
⚫ <5 NEGATIVO
`;

      if (canal) await canal.send(exame);

      return interaction.editReply("✅ Exame registrado!");
    }

    // ===== PARTO =====
    if (interaction.isButton() && interaction.customId.startsWith("parto_")) {

      await interaction.deferReply({ ephemeral: true });

      const id = interaction.customId.split("_")[1];
      const db = loadDB();
      const p = db[id];

      const canal = interaction.guild.channels.cache.get(p.channelId);

      const parto = `
# 🏥✨ PARTO REALIZADO

👩 Mãe: ${p.nome}
👶 Bebê(s): ${p.bebes}
🚻 Sexo: ${p.sexo}

📅 Dia: ${new Date().toLocaleDateString()}
⏰ Hora: ${new Date().toLocaleTimeString()}
👨‍⚕️ Médico: ${interaction.user}

✔️ Finalizado com sucesso
`;

      if (canal) await canal.send(parto);

      return interaction.editReply("🏥 Parto finalizado!");
    }

  } catch (err) {
    console.log(err);
  }
});

client.login(TOKEN);
