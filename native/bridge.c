#include <stdint.h>
#include <xed/xed-interface.h>

/* Each field is a 32-bit word, so JavaScript can read the record without ABI padding. */
static uint32_t result[11];
static char formatted[256];
static uint8_t input[XED_MAX_INSTRUCTION_BYTES];

uint8_t *xed_input(void) { return input; }

uint32_t *xed_decode_one(unsigned count, unsigned bitness, uint32_t address_low,
                         uint32_t address_high) {
  xed_state_t state;
  xed_decoded_inst_t instruction;
  xed_error_enum_t error;
  xed_machine_mode_enum_t mode;
  xed_address_width_enum_t width;
  uint64_t address = ((uint64_t)address_high << 32) | address_low;
  for (unsigned i = 0; i < 11; i++) result[i] = 0;
  if (!count || count > XED_MAX_INSTRUCTION_BYTES) {
    result[0] = 1;
    result[1] = 1;
    return result;
  }
  mode = bitness == 64 ? XED_MACHINE_MODE_LONG_64 :
         bitness == 32 ? XED_MACHINE_MODE_LEGACY_32 : XED_MACHINE_MODE_REAL_16;
  width = bitness == 64 ? XED_ADDRESS_WIDTH_64b :
          bitness == 32 ? XED_ADDRESS_WIDTH_32b : XED_ADDRESS_WIDTH_16b;
  xed_state_init2(&state, mode, width);
  xed_decoded_inst_zero_set_mode(&instruction, &state);
  error = xed_decode(&instruction, input, count);
  if (error != XED_ERROR_NONE) {
    result[0] = error == XED_ERROR_BUFFER_TOO_SHORT ? 2 : 1;
    result[1] = result[0] == 2 ? count : 1;
    result[2] = (uint32_t)(uintptr_t)xed_error_enum_t2str(error);
    return result;
  }
  result[1] = xed_decoded_inst_get_length(&instruction);
  result[3] = (uint32_t)(uintptr_t)formatted;
  result[4] = (uint32_t)(uintptr_t)xed_iclass_enum_t2str(
    xed_decoded_inst_get_iclass(&instruction));
  result[5] = (uint32_t)(uintptr_t)xed_category_enum_t2str(
    xed_decoded_inst_get_category(&instruction));
  result[6] = (uint32_t)(uintptr_t)xed_extension_enum_t2str(
    xed_decoded_inst_get_extension(&instruction));
  result[7] = (uint32_t)(uintptr_t)xed_isa_set_enum_t2str(
    xed_decoded_inst_get_isa_set(&instruction));
  if (xed_decoded_inst_get_branch_displacement_width(&instruction)) {
    uint64_t displacement = (uint64_t)xed_decoded_inst_get_branch_displacement(&instruction);
    result[8] = (uint32_t)displacement;
    result[9] = (uint32_t)(displacement >> 32);
    result[10] = 1;
  }
  formatted[0] = '\0';
  if (!xed_format_context(XED_SYNTAX_INTEL, &instruction, formatted,
                          sizeof(formatted), address, 0, 0)) result[0] = 3;
  return result;
}

void xed_initialize(void) { xed_tables_init(); }
