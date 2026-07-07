package com.codenized.planixor.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.codenized.planixor.R
import com.codenized.planixor.ui.theme.PlanixorTheme

/**
 * Emoji categories: key is the tab icon emoji, value is the list of emojis in that category.
 * Categories: Faces, Gestures, Nature, Animals, Food, Sports, Travel, Objects, Symbols.
 */
private val EMOJI_CATEGORIES = mapOf(
    "😀" to listOf(
        "😀", "😃", "😄", "😁", "😆", "🥹", "😅", "🤣", "😂", "🙂",
        "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙",
        "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
        "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒",
        "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒",
        "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "😵‍💫", "🤯", "🤠",
        "🥳", "🥸", "😎", "🤓", "🧐", "😕", "🫤", "😟", "🙁", "☹️",
        "😮", "😯", "😲", "😳", "🥺", "🥹", "😦", "😧", "😨", "😰",
        "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫",
        "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩",
        "🤡", "👹", "👺", "👻", "👽", "👾", "🤖", "🎃", "😺", "😸",
        "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🫠", "🫡", "🫢",
        "🫣", "🙈", "🙉", "🙊", "💋", "💌", "💘", "💝", "💖", "💗",
    ),
    "👋" to listOf(
        "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "🫷",
        "🫸", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙",
        "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍", "👎", "✊",
        "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏",
        "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻",
        "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄",
        "🫦", "👶", "🧒", "👦", "👧", "🧑", "👱", "👨", "🧔", "👩",
        "🧓", "👴", "👵", "🙍", "🙎", "🙅", "🙆", "💁", "🙋", "🧏",
        "🙇", "🤦", "🤷", "👮", "🕵️", "💂", "🥷", "👷", "🫅", "🤴",
        "👸", "👳", "👲", "🧕", "🤵", "👰", "🤰", "🫃", "🫄", "🤱",
        "👼", "🎅", "🤶", "🦸", "🦹", "🧙", "🧚", "🧛", "🧜", "🧝",
        "🧞", "🧟", "🧌", "💆", "💇", "🚶", "🧍", "🧎", "🏃", "💃",
        "🕺", "👯", "🧖", "🧗", "🤺", "🏇", "⛷️", "🏂", "🏋️", "🤸",
    ),
    "🌞" to listOf(
        "☀️", "🌙", "🌞", "🌝", "🌛", "🌜", "🌚", "🌕", "🌖", "🌗",
        "🌘", "🌑", "🌒", "🌓", "🌔", "⭐", "🌟", "✨", "💫", "🌈",
        "☁️", "⛅", "🌤️", "🌥️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️",
        "☃️", "⛄", "🌬️", "💨", "🌊", "💧", "💦", "☔", "🔥", "🌺",
        "🌸", "🌷", "🌹", "🥀", "🌻", "🌼", "🌿", "🍀", "🍁", "🍂",
        "🍃", "🌴", "🌵", "🌳", "🌲", "🪵", "🪹", "🪺", "🍄", "🐚",
        "🪨", "🌍", "🌎", "🌏", "🪐", "💥", "🌀", "🌪️", "🌫️", "☘️",
        "🪻", "🪷", "🪸", "🫧", "🌾", "🌱", "🪴", "🎋", "🎍", "🎄",
        "🎑", "🎆", "🎇", "🧨", "✨", "🎈", "🎉", "🎊", "🎋", "🎍",
        "🎎", "🎏", "🎐", "🎀", "🎁", "🎗️", "🎟️", "🎫", "🏮", "🪔",
    ),
    "🐶" to listOf(
        "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨",
        "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊",
        "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉",
        "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌",
        "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️", "🦂",
        "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀",
        "🪼", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅",
        "🐆", "🦓", "🫏", "🦍", "🦧", "🦣", "🐘", "🦛", "🦏", "🐪",
        "🐫", "🦒", "🫎", "🦘", "🦬", "🐃", "🐂", "🐄", "🐎", "🐖",
        "🐏", "🐑", "🦙", "🐐", "🦌", "🫏", "🐕", "🐩", "🦮", "🐕‍🦺",
        "🐈", "🐈‍⬛", "🪽", "🐓", "🦃", "🦤", "🦚", "🦜", "🦢", "🪿",
        "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁",
    ),
    "🍎" to listOf(
        "🍎", "🍐", "🍊", "🍋", "🍋‍🟩", "🍌", "🍉", "🍇", "🍓", "🫐",
        "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑",
        "🫛", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄",
        "🧅", "🫚", "🥔", "🍠", "🫘", "🥐", "🍞", "🥖", "🫓", "🥨",
        "🥯", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗",
        "🍖", "🌭", "🍔", "🍟", "🍕", "🫔", "🌮", "🌯", "🫔", "🥙",
        "🧆", "🥗", "🥘", "🫕", "🍲", "🍜", "🍝", "🍛", "🍣", "🍱",
        "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢",
        "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭",
        "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🫘", "🍯", "🥛",
        "☕", "🫖", "🍵", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻",
        "🥂", "🥃", "🫗", "🥤", "🧋", "🧃", "🧉", "🧊", "🥄", "🍽️",
    ),
    "⚽" to listOf(
        "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱",
        "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳",
        "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷",
        "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️",
        "🏃", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗", "🚵", "🚴", "🏇",
        "🤺", "🤾", "🏌️", "🎯", "🎮", "🕹️", "🎲", "🧩", "♟️", "🎰",
        "🎳", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🪘",
        "🎷", "🎺", "🪗", "🎸", "🪕", "🎻", "🪈", "🎪", "🤹", "🎠",
        "🎡", "🎢", "💈", "🎰", "🎳", "🏆", "🥇", "🥈", "🥉", "🏅",
        "🎖️", "🏵️", "🎗️", "🎟️", "🎫", "🎮", "🕹️", "🎲", "🧩", "♟️",
    ),
    "🚗" to listOf(
        "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐",
        "🛻", "🚚", "🚛", "🚜", "🦯", "🦽", "🦼", "🛵", "🏍️", "🛺",
        "🚲", "🛴", "🛹", "🛼", "🚏", "🛣️", "🛤️", "🛢️", "⛽", "🚨",
        "🚥", "🚦", "🛑", "🚧", "⚓", "🛟", "⛵", "🛶", "🚤", "🛳️",
        "⛴️", "🛥️", "🚢", "✈️", "🛩️", "🛫", "🛬", "🪂", "💺", "🚁",
        "🚟", "🚠", "🚡", "🛰️", "🚀", "🛸", "🏠", "🏡", "🏢", "🏣",
        "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏭", "🏯",
        "🏰", "💒", "🗼", "🗽", "⛪", "🕌", "🛕", "🕍", "⛩️", "🕋",
        "⛲", "⛺", "🌁", "🌃", "🏙️", "🌄", "🌅", "🌆", "🌇", "🌉",
        "♨️", "🎠", "🛝", "🎡", "🎢", "💈", "🎪", "🗺️", "🧭", "🏔️",
        "⛰️", "🌋", "🗻", "🏕️", "🏖️", "🏜️", "🏝️", "🏞️", "🗾", "🏘️",
    ),
    "💡" to listOf(
        "💡", "🔦", "🕯️", "🪔", "💰", "💴", "💵", "💶", "💷", "🪙",
        "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧", "🔨", "⛏️", "🪓",
        "🛠️", "🗡️", "⚔️", "🔫", "🪃", "🏹", "🛡️", "🪚", "🔩", "⚙️",
        "🗜️", "🧲", "🪤", "🔑", "🗝️", "🔒", "🔓", "🔏", "🔐", "📱",
        "📲", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🖲️", "💽", "💾", "💿",
        "📀", "🧮", "🎥", "🎞️", "📽️", "🎬", "📺", "📷", "📸", "📹",
        "📼", "🔍", "🔎", "🕯️", "💡", "🔦", "🏮", "🪔", "📔", "📕",
        "📖", "📗", "📘", "📙", "📚", "📓", "📒", "📃", "📜", "📄",
        "📰", "🗞️", "📑", "🔖", "🏷️", "✉️", "📧", "📨", "📩", "📤",
        "📥", "📦", "📪", "📫", "📬", "📭", "📮", "🗳️", "✏️", "✒️",
        "🖋️", "🖊️", "🖌️", "🖍️", "📝", "💼", "📁", "📂", "🗂️", "📅",
        "📆", "🗒️", "🗓️", "📇", "📈", "📉", "📊", "📋", "📌", "📍",
        "📎", "🖇️", "📏", "📐", "✂️", "🗃️", "🗄️", "🗑️", "🔒", "🔓",
        "💊", "💉", "🩺", "🩻", "🩹", "🩼", "🩸", "🧪", "🧫", "🧬",
        "🔬", "🔭", "📡", "🧯", "🪣", "🫙", "🪥", "🪦", "⚱️", "🏺",
    ),
    "❤️" to listOf(
        "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "❤️‍🔥",
        "❤️‍🩹", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
        "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "🪯", "✡️", "🔯", "🕎",
        "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍",
        "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️",
        "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚",
        "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️",
        "🆎", "🆑", "🅾️", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫",
        "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭",
        "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️",
        "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️",
        "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️",
        "🛗", "🈳", "🈂️", "🛂", "🛃", "🛄", "🛅", "🚰", "🔟", "🔢",
    ),
)

/**
 * Category tab labels (emoji icons used as tab identifiers).
 * Order: Faces, Gestures, Nature, Animals, Food, Sports, Travel, Objects, Symbols.
 */
private val EMOJI_CATEGORY_LABELS = listOf("😀", "👋", "🌞", "🐶", "🍎", "⚽", "🚗", "💡", "❤️")

/**
 * A reusable dialog that displays a category-based emoji grid with search.
 * Users can search emojis or switch between category tabs
 * (Faces, Gestures, Nature, Animals, Food, Sports, Travel, Objects, Symbols)
 * and select an emoji from a scrollable grid.
 * The selected emoji is highlighted with a primary container background.
 *
 * @param selectedEmoji The currently selected emoji string, or empty if none.
 * @param onEmojiSelected Callback invoked with the selected emoji string.
 * @param onDismiss Callback invoked when the dialog is dismissed.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EmojiPickerDialog(
    selectedEmoji: String,
    onEmojiSelected: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedCategory by remember { mutableStateOf(EMOJI_CATEGORY_LABELS[0]) }
    var searchQuery by remember { mutableStateOf("") }

    val emojisToShow = if (searchQuery.isNotEmpty()) {
        EMOJI_CATEGORIES.values.flatten().filter { it.contains(searchQuery) }
    } else {
        EMOJI_CATEGORIES[selectedCategory] ?: emptyList()
    }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = modifier
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp)
                .height(480.dp),
        ) {
            // Title
            Text(
                text = stringResource(R.string.emoji_picker_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Search field
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text(stringResource(R.string.emoji_picker_search)) },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Outlined.Search,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp),
                    )
                },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                textStyle = MaterialTheme.typography.bodyMedium,
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Category tabs (hidden when searching)
            if (searchQuery.isEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    EMOJI_CATEGORY_LABELS.forEach { category ->
                        val isSelected = category == selectedCategory
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                    else Color.Transparent,
                                )
                                .clickable { selectedCategory = category },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(text = category, fontSize = 18.sp)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Emoji grid (scrollable)
            FlowRow(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                emojisToShow.forEach { emoji ->
                    val isSelected = emoji == selectedEmoji
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                else Color.Transparent,
                            )
                            .clickable { onEmojiSelected(emoji) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(text = emoji, fontSize = 22.sp)
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun EmojiPickerDialogPreview() {
    PlanixorTheme {
        EmojiPickerDialog(
            selectedEmoji = "😎",
            onEmojiSelected = {},
            onDismiss = {},
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun EmojiPickerDialogNoSelectionPreview() {
    PlanixorTheme {
        EmojiPickerDialog(
            selectedEmoji = "",
            onEmojiSelected = {},
            onDismiss = {},
        )
    }
}
