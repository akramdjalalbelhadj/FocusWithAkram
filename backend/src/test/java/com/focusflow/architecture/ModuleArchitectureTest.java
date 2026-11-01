package com.focusflow.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.springframework.web.bind.annotation.RestController;

/**
 * Organisation en modules : un package par domaine ({@code com.focusflow.<domaine>}), couches a plat,
 * seuls les DTO dans un sous-package {@code dto}. Ces regles empechent la structure de se degrader
 * lorsque de nouveaux domaines sont ajoutes.
 */
@AnalyzeClasses(packages = "com.focusflow", importOptions = ImportOption.DoNotIncludeTests.class)
class ModuleArchitectureTest {

    /** Le seul cycle historique : une session reference sa tache, et la tache agrege le temps de ses sessions. */
    private static final String TASK = "com.focusflow.task..";
    private static final String POMODORO = "com.focusflow.pomodoro..";

    @ArchTest
    static final ArchRule domainsAreFreeOfCycles = slices()
            .matching("com.focusflow.(*)..")
            .should().beFreeOfCycles()
            .ignoreDependency(JavaClass.Predicates.resideInAPackage(TASK), JavaClass.Predicates.resideInAPackage(POMODORO))
            .ignoreDependency(JavaClass.Predicates.resideInAPackage(POMODORO), JavaClass.Predicates.resideInAPackage(TASK));

    @ArchTest
    static final ArchRule commonDependsOnNoDomain = noClasses()
            .that().resideInAPackage("com.focusflow.common..")
            .should().dependOnClassesThat(JavaClass.Predicates.resideInAPackage("com.focusflow..")
                    .and(JavaClass.Predicates.resideOutsideOfPackage("com.focusflow.common..")))
            .because("common ne contient que des briques transverses");

    @ArchTest
    static final ArchRule controllersAreNamedAndPlacedConsistently = classes()
            .that().areAnnotatedWith(RestController.class)
            .should().haveSimpleNameEndingWith("Controller")
            .andShould().resideOutsideOfPackages("..dto..", "com.focusflow.common..", "com.focusflow.config..");

    @ArchTest
    static final ArchRule nothingDependsOnControllers = noClasses()
            .that().areNotAnnotatedWith(RestController.class)
            .should().dependOnClassesThat().areAnnotatedWith(RestController.class)
            .because("un controleur est un point d'entree HTTP, jamais une dependance");

    @ArchTest
    static final ArchRule dtosDoNotTouchPersistence = noClasses()
            .that().resideInAPackage("..dto..")
            .should().dependOnClassesThat().resideInAnyPackage("org.springframework.data..", "jakarta.persistence..")
            .because("un DTO est un contrat de transport, sans acces aux donnees");
}
