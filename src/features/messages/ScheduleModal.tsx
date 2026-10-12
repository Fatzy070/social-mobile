import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useCreateScheduledMessage } from './useMessages';
import type { Theme } from '../../theme/colors';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { metrics } from '../../theme/metrics';

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  initialText?: string;
  onScheduledSuccess?: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  visible,
  onClose,
  conversationId,
  initialText = '',
  onScheduledSuccess,
}) => {
  const { colors, styles } = useThemedStyles(createStyles);
  const [text, setText] = useState(initialText);

  // Initialize with 1 hour from current time
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return new Date(Date.now() + 60 * 60 * 1000);
  });

  // State to control visibility of pickers on Android
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const createScheduledMutation = useCreateScheduledMessage();

  // Reset or initialize text when modal opens
  useEffect(() => {
    if (visible) {
      if (initialText) {
        setText(initialText);
      }
      // Ensure date is at least 10 minutes in the future when opening
      const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
      setSelectedDate(defaultTime);
    }
  }, [visible, initialText]);

  // Validation: Check if selected date is in the future
  const isFutureDate = selectedDate.getTime() > Date.now();
  const isTextValid = text.trim().length > 0;
  const isValid = isFutureDate && isTextValid;

  const handleDateChange = (event: DateTimePickerEvent, newDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed' || !newDate) {
      return;
    }

    // Preserve the currently selected hours and minutes when updating the date
    const updated = new Date(selectedDate);
    updated.setFullYear(newDate.getFullYear());
    updated.setMonth(newDate.getMonth());
    updated.setDate(newDate.getDate());
    setSelectedDate(updated);
  };

  const handleTimeChange = (event: DateTimePickerEvent, newTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'dismissed' || !newTime) {
      return;
    }

    // Preserve the currently selected year, month, date when updating the time
    const updated = new Date(selectedDate);
    updated.setHours(newTime.getHours());
    updated.setMinutes(newTime.getMinutes());
    updated.setSeconds(0);
    updated.setMilliseconds(0);
    setSelectedDate(updated);
  };

  const handleSchedule = () => {
    if (!text.trim()) {
      Alert.alert('Empty Message', 'Please enter some text to schedule.');
      return;
    }

    if (selectedDate.getTime() <= Date.now()) {
      Alert.alert(
        'Invalid Schedule Time',
        'Please choose a future date and time. Messages cannot be scheduled in the past.'
      );
      return;
    }

    // ISO string converts the local device time accurately to UTC
    const isoScheduledFor = selectedDate.toISOString();

    createScheduledMutation.mutate(
      {
        conversationId,
        text: text.trim(),
        scheduledFor: isoScheduledFor,
      },
      {
        onSuccess: () => {
          Alert.alert(
            'Message Scheduled',
            `Your message is scheduled for delivery on ${format(
              selectedDate,
              'MMMM d, yyyy'
            )} at ${format(selectedDate, 'h:mm a')}.`
          );
          setText('');
          onClose();
          onScheduledSuccess?.();
        },
        onError: (err: any) => {
          Alert.alert(
            'Failed to Schedule',
            err.response?.data?.message || 'Could not schedule your message.'
          );
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      >
        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="time" size={20} color={colors.accentText} />
              <Text style={styles.title}>Schedule Message</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={colors.fgMuted} />
            </TouchableOpacity>
          </View>

          {/* Message Content Input */}
          <Text style={styles.label}>Message Content</Text>
          <TextInput
            style={styles.input}
            placeholder="Write your message here..."
            placeholderTextColor={colors.fgMuted}
            value={text}
            onChangeText={setText}
            multiline
          />

          {/* Date Selector */}
          <View style={styles.pickerSection}>
            <Text style={styles.label}>Delivery Date</Text>
            {Platform.OS === 'ios' ? (
              <View style={styles.iosPickerRow}>
                <Ionicons name="calendar-outline" size={18} color={colors.accentText} style={{ marginRight: 8 }} />
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                  themeVariant="dark"
                  accentColor={colors.accent}
                  style={styles.iosPicker}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.androidPickerBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.pickerBtnContent}>
                  <Ionicons name="calendar-outline" size={18} color={colors.accentText} />
                  <Text style={styles.pickerBtnText}>
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.fgMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Time Selector */}
          <View style={styles.pickerSection}>
            <Text style={styles.label}>Delivery Time</Text>
            {Platform.OS === 'ios' ? (
              <View style={styles.iosPickerRow}>
                <Ionicons name="time-outline" size={18} color={colors.accentText} style={{ marginRight: 8 }} />
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                  themeVariant="dark"
                  accentColor={colors.accent}
                  style={styles.iosPicker}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.androidPickerBtn}
                onPress={() => setShowTimePicker(true)}
              >
                <View style={styles.pickerBtnContent}>
                  <Ionicons name="time-outline" size={18} color={colors.accentText} />
                  <Text style={styles.pickerBtnText}>
                    {format(selectedDate, 'h:mm a')}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={16} color={colors.fgMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Android Picker Dialogs */}
          {Platform.OS === 'android' && showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {Platform.OS === 'android' && showTimePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}

          {/* Scheduled Time Preview & Validation Warning */}
          <View style={styles.previewBox}>
            <View style={styles.previewRow}>
              <Ionicons
                name={isFutureDate ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                size={16}
                color={isFutureDate ? colors.success : colors.error}
              />
              <Text
                style={[
                  styles.previewText,
                  !isFutureDate && { color: colors.error },
                ]}
              >
                {isFutureDate
                  ? `Will send: ${format(selectedDate, 'MMM d, yyyy · h:mm a')}`
                  : '⚠️ Please choose a future date and time'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={createScheduledMutation.isPending}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.scheduleBtn,
                (!isValid || createScheduledMutation.isPending) && styles.scheduleBtnDisabled,
              ]}
              disabled={!isValid || createScheduledMutation.isPending}
              onPress={handleSchedule}
            >
              {createScheduledMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.scheduleBtnText}>Schedule Message</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (colors: Theme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.fg,
  },
  closeBtn: {
    padding: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.fgMuted,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: metrics.radius,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.fg,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  pickerSection: {
    marginBottom: 12,
  },
  iosPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: metrics.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iosPicker: {
    flex: 1,
  },
  androidPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: metrics.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.fg,
  },
  previewBox: {
    backgroundColor: 'rgba(28, 28, 32, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewText: {
    fontSize: 12,
    color: colors.fgMuted,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: metrics.radius,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: colors.fg,
    fontSize: 13,
    fontWeight: '600',
  },
  scheduleBtn: {
    flex: 1.4,
    backgroundColor: colors.accent,
    borderRadius: metrics.radius,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleBtnDisabled: {
    opacity: 0.4,
  },
  scheduleBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
