package com.focusflow.transfer;

import com.focusflow.transfer.dto.BackupFile;
import com.focusflow.transfer.dto.ImportReport;
import com.focusflow.transfer.dto.TaskData;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class TransferController {

    private final TransferService service;

    public TransferController(TransferService service) {
        this.service = service;
    }

    @GetMapping("/export/tasks")
    public ResponseEntity<?> exportTasks(@RequestParam(defaultValue = "json") String format,
                                         @RequestParam(defaultValue = "ALL") ExportScope scope) {
        String base = "focusflow-taches-" + scope.name().toLowerCase();
        if ("csv".equalsIgnoreCase(format)) {
            return download(service.exportCsv(scope).getBytes(StandardCharsets.UTF_8), base + ".csv",
                    MediaType.parseMediaType("text/csv;charset=UTF-8"));
        }
        List<TaskData> data = service.exportTasks(scope);
        return attachment(data, base + ".json");
    }

    @GetMapping("/export/backup")
    public ResponseEntity<?> backup() {
        return attachment(service.backup(), "focusflow-sauvegarde.json");
    }

    /** Projets choisis (et/ou dossiers entiers) au format de sauvegarde v6 ; sans filtre : tous les projets. */
    @GetMapping("/export/projects")
    public ResponseEntity<?> exportProjects(@RequestParam(name = "id", required = false) List<UUID> ids,
                                            @RequestParam(name = "folderId", required = false) List<UUID> folderIds,
                                            @RequestParam(defaultValue = "true") boolean withTasks) {
        return attachment(service.exportProjects(ids == null ? List.of() : ids,
                folderIds == null ? List.of() : folderIds, withTasks), "focusflow-projets.json");
    }

    @PostMapping("/import")
    public ImportReport importBackup(@RequestBody BackupFile file,
                                     @RequestParam(defaultValue = "false") boolean dryRun,
                                     @RequestParam(defaultValue = "MERGE") ConflictMode conflicts) {
        return service.importBackup(file, dryRun, conflicts);
    }

    private static ResponseEntity<byte[]> download(byte[] body, String filename, MediaType type) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .contentType(type)
                .body(body);
    }

    private static <T> ResponseEntity<T> attachment(T body, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }
}
