import sys
from PIL import Image

def remove_black_background(input_path, output_path, threshold=30):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Check if pixel is close to black
        if item[0] < threshold and item[1] < threshold and item[2] < threshold:
            new_data.append((0, 0, 0, 0)) # Transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    remove_black_background(
        "/Users/thanojbuddhima/.gemini/antigravity-ide/brain/4bfdbf46-1ff5-4f8b-986a-2f6b7f92397c/robot_on_black_1786913328317.jpg",
        "public/images/robot.png",
        threshold=40
    )
