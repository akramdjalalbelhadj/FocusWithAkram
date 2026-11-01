package com.focusflow.finance;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    @Query("select c from Category c left join fetch c.parent order by c.position asc, lower(c.name) asc")
    List<Category> findAllOrdered();

    boolean existsByParentId(UUID parentId);

    List<Category> findByParentId(UUID parentId);

    @Query("select count(c) > 0 from Category c where c.archived = false and lower(c.name) = lower(:name) "
            + "and ((:parentId is null and c.parent is null) or c.parent.id = :parentId) and (:excludeId is null or c.id <> :excludeId)")
    boolean existsActiveName(String name, UUID parentId, UUID excludeId);
}
