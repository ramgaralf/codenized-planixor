package com.codenized.planixor.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.codenized.planixor.R
import com.codenized.planixor.ui.theme.PlanixorTheme
import com.codenized.planixor.ui.theme.PrimaryBlue
import com.codenized.planixor.ui.theme.PrimaryPurple

@Composable
fun PlanixorFAB(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val gradientBrush = Brush.linearGradient(
        colors = listOf(PrimaryBlue, PrimaryPurple),
    )

    Box(
        modifier = modifier
            .size(56.dp)
            .clip(CircleShape)
            .background(brush = gradientBrush, shape = CircleShape)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = ripple(bounded = true, color = Color.White),
                role = Role.Button,
                onClickLabel = stringResource(R.string.fab_content_description),
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Default.Add,
            contentDescription = stringResource(R.string.fab_content_description),
            tint = Color.White,
        )
    }
}

@Preview(showBackground = true)
@Composable
private fun PlanixorFABPreview() {
    PlanixorTheme {
        PlanixorFAB(onClick = {})
    }
}
