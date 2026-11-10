package com.focusflow.note;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NoteMapperTest {

    @Test
    void theExcerptDropsMarkdownSyntaxButKeepsTheText() {
        assertThat(NoteMapper.excerpt("# Titre\n\n> citation\n1. [ ] un\n* deux `code`\n---\n```js\nx = snake_case\n```"))
                .isEqualTo("Titre citation un deux code x = snake_case");
        assertThat(NoteMapper.excerpt("![schema](a.png) et [lien](https://x.org) ~~barre~~ __gras__"))
                .isEqualTo("schema et lien barre gras");
        assertThat(NoteMapper.excerpt(null)).isEmpty();
        assertThat(NoteMapper.excerpt("  \n ")).isEmpty();
    }

    @Test
    void theExcerptDropsHighlightMarkersButKeepsComparisons() {
        assertThat(NoteMapper.excerpt("Un ==mot jaune==, <mark data-color=\"red\">rouge</mark> et <MARK>x</MARK>"))
                .isEqualTo("Un mot jaune, rouge et x");
        assertThat(NoteMapper.excerpt("si a == b alors ==c==")).isEqualTo("si a == b alors c");
    }

    @Test
    void aLongExcerptIsCutOnAWordBoundary() {
        String excerpt = NoteMapper.excerpt("mot ".repeat(100));
        assertThat(excerpt).endsWith("mot…").hasSizeLessThanOrEqualTo(NoteMapper.EXCERPT_MAX + 1);
    }
}
