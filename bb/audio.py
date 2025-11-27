from pydub import AudioSegment
import os

def mix_audio(*input_files):
    # Load the audio files
    audio_segments = [AudioSegment.from_file(file) for file in input_files]

    # Make all audio files the same length by padding with silence if needed
    max_duration = max(len(audio) for audio in audio_segments)
    audio_segments = [audio + AudioSegment.silent(duration=max_duration - len(audio)) for audio in audio_segments]

    # Overlay the audio files
    mixed_audio = audio_segments[0]
    for audio in audio_segments[1:]:
        mixed_audio = mixed_audio.overlay(audio)

    # Create the output filename
    base_folder = os.path.dirname(input_files[0])
    output_filename = os.path.join(base_folder, "_".join(os.path.splitext(os.path.basename(file))[0] for file in input_files) + ".ogg")

    # Export the final mixed audio
    mixed_audio.export(output_filename, format="ogg")

    print(f"Mixing complete. Saved as '{output_filename}'.")

# Example usage
mix_audio("bb_vol_1/dawna_e1/cutscene/post/audio/dawna_post_moan_2.ogg", "bb_vol_1/dawna_e1/cutscene/post/audio/sparkle.ogg")