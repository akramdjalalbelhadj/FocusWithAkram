package com.focusflow.folderdeletion;

import com.focusflow.folderdeletion.dto.FolderDeletionReport;
import com.focusflow.folderdeletion.dto.FolderDeletionRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Suppression de dossiers de projets avec le sort de leurs projets ; {@code dryRun=true} : apercu sans ecriture. */
@RestController
@RequestMapping("/api/v1/project-folders/deletion")
public class FolderDeletionController {

    private final FolderDeletionService service;

    public FolderDeletionController(FolderDeletionService service) {
        this.service = service;
    }

    @PostMapping
    public FolderDeletionReport delete(@RequestBody FolderDeletionRequest request,
                                       @RequestParam(defaultValue = "false") boolean dryRun) {
        return service.delete(request.folderIds(), request.mode(), dryRun);
    }
}
