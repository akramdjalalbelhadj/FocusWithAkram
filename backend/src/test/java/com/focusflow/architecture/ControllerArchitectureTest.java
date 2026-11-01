package com.focusflow.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import jakarta.persistence.Entity;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.data.repository.Repository;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Garde-fous pour les futurs endpoints : contrats HTTP et acces aux donnees separes. */
class ControllerArchitectureTest {
    @Test
    void controllersDelegatePersistenceAndAcceptTypedBodies() throws Exception {
        for (Class<?> controller : controllers()) {
            for (var field : controller.getDeclaredFields()) {
                assertThat(Repository.class.isAssignableFrom(field.getType()))
                        .as("%s.%s ne doit pas acceder directement a un repository", controller.getSimpleName(), field.getName())
                        .isFalse();
            }
            for (var method : controller.getDeclaredMethods()) {
                for (var parameter : method.getParameters()) {
                    if (parameter.isAnnotationPresent(RequestBody.class)) {
                        assertThat(Map.class.isAssignableFrom(parameter.getType()))
                                .as("Le corps de %s.%s doit utiliser un DTO", controller.getSimpleName(), method.getName())
                                .isFalse();
                    }
                }
            }
        }
    }

    @Test
    void httpResponsesDoNotExposeJpaEntitiesThroughDtos() throws Exception {
        for (Class<?> controller : controllers()) {
            for (var method : controller.getDeclaredMethods()) {
                assertNoEntity(method.getGenericReturnType(), new HashSet<>());
            }
        }
    }

    private void assertNoEntity(Type type, Set<Type> visited) {
        if (!visited.add(type)) return;
        if (type instanceof ParameterizedType parameterized) {
            assertNoEntity(parameterized.getRawType(), visited);
            for (Type argument : parameterized.getActualTypeArguments()) assertNoEntity(argument, visited);
        } else if (type instanceof Class<?> clazz) {
            assertThat(clazz.isAnnotationPresent(Entity.class)).as("Une entite JPA ne doit pas etre exposee : %s", clazz).isFalse();
            if (clazz.isRecord()) {
                for (var component : clazz.getRecordComponents()) assertNoEntity(component.getGenericType(), visited);
            }
        }
    }

    private Set<Class<?>> controllers() throws ClassNotFoundException {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        Set<Class<?>> classes = new HashSet<>();
        for (var bean : scanner.findCandidateComponents("com.focusflow")) {
            classes.add(Class.forName(bean.getBeanClassName()));
        }
        assertThat(classes).isNotEmpty();
        return classes;
    }
}
