package com.focusflow.note;

import com.focusflow.note.dto.NoteCategoryRef;
import com.focusflow.note.dto.NoteCategoryResponse;
import com.focusflow.note.dto.NoteResponse;
import com.focusflow.note.dto.NoteSummary;
import com.focusflow.task.OriginProgress;
import com.focusflow.task.dto.TaskResponse;
import java.util.List;
import java.util.regex.Pattern;

/** Mapping explicite des idees et categories vers le contrat HTTP. */
final class NoteMapper {

    static final int EXCERPT_MAX = 240;

    private static final Pattern FENCE = Pattern.compile("(?m)^\\s*(```|~~~).*$");
    private static final Pattern BLOCK_MARKERS = Pattern.compile(
            "(?m)^\\s*(#{1,6}\\s+|>\\s?|[-*+]\\s+(\\[[ xX]\\]\\s+)?|\\d+[.)]\\s+(\\[[ xX]\\]\\s+)?)");
    private static final Pattern IMAGE = Pattern.compile("!\\[([^\\]]*)\\]\\([^)]*\\)");
    private static final Pattern LINK = Pattern.compile("\\[([^\\]]*)\\]\\([^)]*\\)");
    private static final Pattern EMPHASIS = Pattern.compile("\\*\\*|__|~~|[*`]");
    /** Surlignage jaune `==texte==` (« a == b » n'en est pas un) et balises `<mark ...>` des autres couleurs. */
    private static final Pattern HIGHLIGHT = Pattern.compile("==(?=[^\\s=])(.*?[^\\s=])==(?!=)");
    private static final Pattern MARK_TAG = Pattern.compile("(?i)</?mark\\b[^>]*>");
    private static final Pattern RULE = Pattern.compile("(?m)^\\s*([-*_]\\s*){3,}$");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private NoteMapper() {
    }

    static NoteCategoryRef ref(NoteCategory c) {
        return c == null ? null : new NoteCategoryRef(c.getId(), c.getName(), c.getColor());
    }

    static List<NoteCategoryRef> refs(Note n) {
        return n.getCategories().stream().map(NoteMapper::ref).toList();
    }

    static NoteCategoryResponse toResponse(NoteCategory c, long noteCount) {
        return new NoteCategoryResponse(c.getId(), c.getName(), c.getColor(), c.getCreatedAt(), noteCount);
    }

    static NoteSummary toSummary(Note n, OriginProgress progress) {
        OriginProgress p = progress == null ? new OriginProgress(0, 0) : progress;
        List<NoteCategoryRef> categories = refs(n);
        return new NoteSummary(n.getId(), n.getTitle(), excerpt(n.getContent()), first(categories), categories, tags(n),
                n.isFavorite(), n.getCreatedAt(), n.getUpdatedAt(), p.total(), p.done(), n.getArchivedAt(), reason(n),
                n.getPurgeAt());
    }

    static NoteResponse toResponse(Note n, List<TaskResponse> tasks) {
        List<NoteCategoryRef> categories = refs(n);
        return new NoteResponse(n.getId(), n.getTitle(), n.getContent(), first(categories), categories, tags(n),
                n.isFavorite(),
                n.getCreatedAt(), n.getUpdatedAt(), n.getVersion(), tasks, n.getArchivedAt(), reason(n), n.getPurgeAt());
    }

    private static NoteCategoryRef first(List<NoteCategoryRef> categories) {
        return categories.isEmpty() ? null : categories.getFirst();
    }

    private static String reason(Note n) {
        return n.getArchiveReason() == null ? null : n.getArchiveReason().name();
    }

    static List<String> tags(Note n) {
        return n.getTags().stream().sorted(String.CASE_INSENSITIVE_ORDER).toList();
    }

    /** Premier texte lisible d'un contenu Markdown, sans syntaxe, coupe a {@value #EXCERPT_MAX} caracteres. */
    static String excerpt(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }
        String s = FENCE.matcher(markdown).replaceAll("");
        s = RULE.matcher(s).replaceAll("");
        s = BLOCK_MARKERS.matcher(s).replaceAll("");
        s = IMAGE.matcher(s).replaceAll("$1");
        s = LINK.matcher(s).replaceAll("$1");
        s = HIGHLIGHT.matcher(s).replaceAll("$1");
        s = MARK_TAG.matcher(s).replaceAll("");
        s = EMPHASIS.matcher(s).replaceAll("");
        s = SPACES.matcher(s).replaceAll(" ").strip();
        if (s.length() <= EXCERPT_MAX) {
            return s;
        }
        int cut = s.lastIndexOf(' ', EXCERPT_MAX);
        return s.substring(0, cut > EXCERPT_MAX / 2 ? cut : EXCERPT_MAX).stripTrailing() + "…";
    }
}
