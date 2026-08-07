# Testing Patterns

**Analysis Date:** 2026-08-07

## Test Framework

**Runner:**
- Frontend: Vitest (`vitest` v4.1.10)
- Backend: JUnit 5 (via `spring-boot-starter-test`)
- Config: Frontend uses `vite.config.js` for vitest configuration. Backend relies on standard Maven surefire configuration.

**Assertion Library:**
- Frontend: Vitest `expect`
- Backend: AssertJ (`assertThat`), Spring MockMvc ResultMatchers (`andExpect(jsonPath(...))`)

**Run Commands:**
```bash
npm run test           # Run frontend tests
./mvnw test            # Run backend tests
```

## Test File Organization

**Location:**
- Frontend: Co-located with source files (`App.test.jsx`)
- Backend: Separate `src/test/java/...` directory mirroring `src/main/java/...`.

**Naming:**
- Frontend: `[Component].test.jsx`
- Backend: `[Class]Test.java`

**Structure:**
```
backend/src/test/java/com/sidequest/board/
├── controller/
│   └── QuestControllerTest.java
└── service/
    └── QuestServiceTest.java
```

## Test Structure

**Suite Organization:**
```java
@WebMvcTest(QuestController.class)
public class QuestControllerTest {
  // @Autowired mocks/dependencies
  // ── Helpers ──────────────
  // ── POST /api/quests ─────
  // @Test methods
}
```

**Patterns:**
- **Setup pattern:** Inject mocks (`@Mock`, `@MockBean`), use `@InjectMocks`. Setup helper methods (`buildQuest`, `persistedQuest`) used to generate standard test data inline rather than a massive `@BeforeEach`.
- **Teardown pattern:** Not explicitly required, Mockito handles mock reset between tests.
- **Assertion pattern:** Use AssertJ `assertThat(result).isEqualTo(...)` for unit tests. Use MockMvc `andExpect(status().isOk())` for slice tests.

## Mocking

**Framework:** Mockito (Backend)

**Patterns:**
```java
@MockBean private QuestService questService;

@Test
void getQuests_returnsListForToday() throws Exception {
  Quest q = buildQuest(2L, "Brew a Potion", Difficulty.BRONZE, QuestStatus.ACTIVE);
  when(questService.getQuestsForDate(any(LocalDate.class)))
      .thenReturn(List.of(QuestResponse.fromEntity(q)));
  // ... perform mockMvc request and assert
}
```

**What to Mock:**
- Service layer dependencies in Controller tests.
- Repository dependencies in Service tests.

**What NOT to Mock:**
- DTOs, Entities, and basic value objects.

## Fixtures and Factories

**Test Data:**
```java
private Quest persistedQuest(Long id, String title, Difficulty difficulty, QuestStatus status) {
  Quest q = new Quest();
  q.setId(id);
  // ...
  return q;
}
```

**Location:**
- Helper methods are kept inline within the test classes (`QuestControllerTest.java`, `QuestServiceTest.java`) under a `// ── Helpers ──` section.

## Coverage

**Requirements:** None enforced. No Jacoco plugin configured in `pom.xml`.

**View Coverage:**
```bash
# Not currently configured
```

## Test Types

**Unit Tests:**
- Scope: Service layer business logic and data transformations.
- Approach: Plain JUnit 5 with Mockito (`@ExtendWith(MockitoExtension.class)`). Fast, no Spring context loading.

**Integration Tests:**
- Scope: Controller layer slice tests.
- Approach: Spring `@WebMvcTest` with `MockMvc`. Tests serialization, HTTP status mapping, and validation logic.

**E2E Tests:**
- Not used.

## Common Patterns

**Async Testing:**
- Frontend relies on standard Vitest promise resolving, though no async tests are written yet.

**Error Testing:**
```java
@Test
void updateQuest_notFound_returns404() throws Exception {
  when(questService.updateQuest(eq(999L), any(QuestRequest.class)))
      .thenThrow(new QuestNotFoundException(999L));
  // assert 404 response
}
```
Use `assertThatThrownBy(() -> ...).isInstanceOf(Exception.class)` for service layer error testing.

---

*Testing analysis: 2026-08-07*
